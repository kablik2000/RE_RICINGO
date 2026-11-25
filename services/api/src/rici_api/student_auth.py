"""Student accounts in the app (ADR-0013): accepting an invitation, sign-in, devices.

- An invitation code alone creates the account (owner decision); the account gets the invited
  e-mail. Wrong codes are throttled per client address.
- Passwords: Argon2id like teachers, at least 12 characters (students sign in on phones; the
  device limit and throttling make guessing impractical).
- Each device has its own session (60 days without use, at most a year). At most 3 devices at
  a time: a sign-in on a fourth is refused unless the student, after giving the right password,
  chooses a device to sign out.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from rici_api import auth, students
from rici_api.models import AuthSession, Invitation, TeacherStudent, User

STUDENT_PASSWORD_MIN_LENGTH = 12
MAX_DEVICES = 3
MAX_CODE_FAILURES_PER_ADDRESS = 10
STUDENT_SESSIONS = auth.STUDENT_SESSIONS
INVITATION_ATTEMPT_KEY = "invitation-code"


class InvalidInvitationError(Exception):
    """The code is unknown, used, revoked or expired (deliberately not more specific)."""


class ExistingAccountError(Exception):
    """The invited e-mail already has an active account: accept with its current password."""


class WeakPasswordError(Exception):
    def __init__(self, problem: str) -> None:
        super().__init__(problem)


class DeviceLimitError(Exception):
    """The account is signed in on MAX_DEVICES devices; carries them so one can be replaced."""

    def __init__(self, devices: list["Device"]) -> None:
        super().__init__("Signed in on too many devices.")
        self.devices = devices


@dataclass(frozen=True)
class Student:
    id: uuid.UUID
    email: str
    display_name: str


@dataclass(frozen=True)
class Device:
    id: uuid.UUID
    name: str | None
    signed_in_at: datetime
    last_seen_at: datetime
    current: bool


@dataclass(frozen=True)
class StudentSignedIn:
    token: str
    expires_at: datetime
    student: Student


def _student(user: User) -> Student:
    return Student(id=user.id, email=user.email, display_name=user.display_name)


def _device_name(name: str | None) -> str | None:
    cleaned = (name or "").strip()[:100]
    return cleaned or None


def _active_sessions(session: Session, user_id: uuid.UUID) -> list[AuthSession]:
    now = datetime.now(UTC)
    found = session.scalars(
        select(AuthSession)
        .where(AuthSession.user_id == user_id)
        .order_by(AuthSession.last_seen_at.desc())
    ).all()
    active = []
    for item in found:
        if now >= item.expires_at or now - item.last_seen_at >= STUDENT_SESSIONS.idle_timeout:
            session.delete(item)
        else:
            active.append(item)
    session.flush()
    return active


def _devices(items: list[AuthSession], current_id: uuid.UUID | None = None) -> list[Device]:
    return [
        Device(
            id=item.id,
            name=item.device_name,
            signed_in_at=item.created_at,
            last_seen_at=item.last_seen_at,
            current=item.id == current_id,
        )
        for item in items
    ]


def _open_device(
    session: Session, user: User, device_name: str | None, replace_device_id: uuid.UUID | None
) -> StudentSignedIn:
    """Opens a session on a new device within the device limit."""
    active = _active_sessions(session, user.id)
    if replace_device_id is not None:
        replaced = next((item for item in active if item.id == replace_device_id), None)
        if replaced is not None:
            session.delete(replaced)
            session.flush()
            active.remove(replaced)
    if len(active) >= MAX_DEVICES:
        raise DeviceLimitError(_devices(active))
    token, expires_at = auth.open_session(
        session, user, STUDENT_SESSIONS, device_name=_device_name(device_name)
    )
    return StudentSignedIn(token=token, expires_at=expires_at, student=_student(user))


def sign_in(
    session: Session,
    email: str,
    password: str,
    address: str,
    device_name: str | None,
    replace_device_id: uuid.UUID | None = None,
) -> StudentSignedIn:
    """Student sign-in on a device. Commit even when it raises InvalidCredentialsError (the
    failed attempt is kept) or DeviceLimitError (the password was right)."""
    user = auth.check_password(session, email, password, address, auth.STUDENT)
    return _open_device(session, user, device_name, replace_device_id)


def accept_invitation(
    session: Session, code: str, password: str, address: str, device_name: str | None
) -> StudentSignedIn:
    """Redeems an invitation code: creates (or re-enables) the student account with the invited
    e-mail, links it to the teacher and signs this device in. Commit even when it raises
    InvalidInvitationError: the failed attempt must be counted."""
    auth.throttle_address(session, address, MAX_CODE_FAILURES_PER_ADDRESS)
    now = datetime.now(UTC)
    invitation = session.scalar(
        select(Invitation).where(Invitation.code_hash == students.code_hash(code))
    )
    usable = (
        invitation is not None
        and invitation.accepted_at is None
        and invitation.revoked_at is None
        and invitation.expires_at > now
    )
    if invitation is None or not usable:
        auth.record_attempt(session, INVITATION_ATTEMPT_KEY, address, succeeded=False)
        raise InvalidInvitationError

    user = session.scalar(select(User).where(User.email == invitation.email))
    if user is not None and user.role != auth.STUDENT:
        # A Studio account cannot become a student (also refused when inviting).
        raise InvalidInvitationError
    if user is not None and user.is_active:
        # Another teacher's student: the code only adds this teacher. The current password is
        # required, so a code cannot take over an account somebody else uses.
        try:
            auth.check_password(session, user.email, password, address, auth.STUDENT)
        except auth.InvalidCredentialsError as error:
            raise ExistingAccountError from error
    elif (
        problem := auth.password_problem(password, invitation.email, STUDENT_PASSWORD_MIN_LENGTH)
    ) is not None:
        raise WeakPasswordError(problem)
    if user is None:
        user = User(
            organization_id=invitation.organization_id,
            email=invitation.email,
            display_name=invitation.display_name,
            role=auth.STUDENT,
            password_hash=auth.hash_password(password),
        )
        session.add(user)
    elif not user.is_active:
        # A disabled account (no teacher left) starts again with the new password.
        user.password_hash = auth.hash_password(password)
        user.password_changed_at = now
        user.is_active = True
        auth.end_all_sessions(session, user.id)
    user.is_minor = user.is_minor or invitation.is_minor
    if invitation.is_minor:
        user.parental_consent_at = invitation.parental_consent_at
    session.flush()
    if session.get(TeacherStudent, (invitation.teacher_id, user.id)) is None:
        session.add(TeacherStudent(teacher_id=invitation.teacher_id, student_id=user.id))
    invitation.accepted_at = now
    auth.record_attempt(session, INVITATION_ATTEMPT_KEY, address, succeeded=True)
    return _open_device(session, user, device_name, None)


def authenticate(session: Session, token: str) -> tuple[Student, uuid.UUID] | None:
    """The student and the current session's ID for a token, or None."""
    found = auth.resolve_session(session, token, auth.STUDENT, STUDENT_SESSIONS)
    if found is None:
        return None
    auth_session, user = found
    return _student(user), auth_session.id


def devices(session: Session, student_id: uuid.UUID, current_id: uuid.UUID) -> list[Device]:
    return _devices(_active_sessions(session, student_id), current_id)


def remove_device(session: Session, student_id: uuid.UUID, device_id: uuid.UUID) -> bool:
    """Signs one of the student's devices out; False when it is not theirs."""
    result = session.execute(
        delete(AuthSession).where(AuthSession.id == device_id, AuthSession.user_id == student_id)
    )
    session.flush()
    return bool(result.rowcount)  # type: ignore[attr-defined]


def device_count(session: Session, student_id: uuid.UUID) -> int:
    return len(_active_sessions(session, student_id))
