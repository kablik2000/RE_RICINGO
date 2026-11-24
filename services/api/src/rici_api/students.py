"""Students and invitations for the Teacher Studio (ADR-0013).

A teacher invites a student by e-mail; the e-mail carries a one-time code that the student enters
in the app (step 3) to create their account. Only the SHA-256 of the code is stored. A student
under 15 can be invited only after the teacher confirms the parents' consent (GDPR art. 8).
Every function works on behalf of one teacher and sees only that teacher's students.
"""

import hashlib
import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from rici_api.auth import Teacher, normalize_email
from rici_api.mailer import Email, Mailer, MailError
from rici_api.models import AuthSession, Invitation, TeacherStudent, User

INVITATION_LIFETIME = timedelta(days=14)
MAX_INVITATIONS_PER_DAY = 50
# Crockford base32 without I, L, O, U: easy to read and type; 12 characters = 60 bits.
CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
CODE_LENGTH = 12
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

InvitationStatus = Literal["pending", "expired"]


class InvitationError(Exception):
    """The invitation cannot be created or changed as asked. `code` tells clients which case."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class InvitationNotFoundError(Exception):
    """No such invitation or student of this teacher."""


class DeliveryError(Exception):
    """The invitation e-mail could not be sent; nothing was saved."""


@dataclass(frozen=True)
class InvitationSummary:
    id: uuid.UUID
    email: str
    display_name: str
    is_minor: bool
    status: InvitationStatus
    sent_at: datetime
    expires_at: datetime


@dataclass(frozen=True)
class StudentSummary:
    id: uuid.UUID
    email: str
    display_name: str
    is_minor: bool
    since: datetime


def new_code() -> str:
    """A random invitation code, grouped for reading: `XXXX-XXXX-XXXX`."""
    raw = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
    return "-".join(raw[i : i + 4] for i in range(0, CODE_LENGTH, 4))


def code_hash(code: str) -> str:
    """Hash of a code as typed: case, spaces and dashes do not matter; O/I/L read as 0/1/1."""
    normalized = re.sub(r"[\s-]", "", code).upper().translate(str.maketrans("OIL", "011"))
    return hashlib.sha256(normalized.encode("ascii", "ignore")).hexdigest()


def _summary(invitation: Invitation, now: datetime) -> InvitationSummary:
    return InvitationSummary(
        id=invitation.id,
        email=invitation.email,
        display_name=invitation.display_name,
        is_minor=invitation.is_minor,
        status="expired" if invitation.expires_at <= now else "pending",
        sent_at=invitation.sent_at,
        expires_at=invitation.expires_at,
    )


def _invitation_email(teacher: Teacher, invitation: Invitation, code: str) -> Email:
    expires = invitation.expires_at.strftime("%d. %m. %Y")
    return Email(
        to=invitation.email,
        subject="Pozvánka do aplikace Italština RICI",
        text=(
            f"Dobrý den, {invitation.display_name},\n\n"
            f"{teacher.display_name} vás zve do aplikace Italština RICI. Jako student uvidíte "
            "lekce a okruhy, které vám doporučí.\n\n"
            "1. Nainstalujte si aplikaci Italština RICI.\n"
            "2. V aplikaci zvolte „Mám pozvánku“.\n"
            f"3. Zadejte kód pozvánky: {code}\n\n"
            f"Kód platí do {expires} a použít ho lze jen jednou. Pokud jste pozvánku nečekali, "
            "e-mail ignorujte.\n"
        ),
    )


def _send(mailer: Mailer, email: Email) -> None:
    try:
        mailer.send(email)
    except MailError as error:
        raise DeliveryError(str(error)) from error


def _own_pending(session: Session, teacher: Teacher, invitation_id: uuid.UUID) -> Invitation:
    invitation = session.get(Invitation, invitation_id)
    if (
        invitation is None
        or invitation.teacher_id != teacher.id
        or invitation.accepted_at is not None
        or invitation.revoked_at is not None
    ):
        raise InvitationNotFoundError(str(invitation_id))
    return invitation


def invite(
    session: Session,
    mailer: Mailer,
    teacher: Teacher,
    email: str,
    display_name: str,
    is_minor: bool,
    parental_consent: bool,
) -> InvitationSummary:
    """Creates an invitation and e-mails its code. Raises DeliveryError when sending fails;
    the caller then rolls back, so no invitation exists that the student never received."""
    now = datetime.now(UTC)
    normalized = normalize_email(email)
    name = display_name.strip()
    if not _EMAIL.match(normalized) or len(normalized) > 254:
        raise InvitationError("invalid_email", "Not a valid e-mail address.")
    if not name or len(name) > 200:
        raise InvitationError(
            "name_required", "The student's name is required (at most 200 characters)."
        )
    if is_minor and not parental_consent:
        raise InvitationError("consent_required", "A student under 15 needs the parents' consent.")
    sent_today = session.scalar(
        select(func.count())
        .select_from(Invitation)
        .where(Invitation.teacher_id == teacher.id, Invitation.sent_at > now - timedelta(days=1))
    )
    if (sent_today or 0) >= MAX_INVITATIONS_PER_DAY:
        raise InvitationError("too_many_invitations", "Too many invitations today.")
    existing = session.scalar(select(User).where(User.email == normalized))
    if existing is not None:
        if existing.role != "student":
            raise InvitationError("studio_account", "This e-mail belongs to a Studio account.")
        if session.get(TeacherStudent, (teacher.id, existing.id)) is not None:
            raise InvitationError("already_student", "This student is already yours.")
    pending = session.scalar(
        select(Invitation.id).where(
            Invitation.teacher_id == teacher.id,
            Invitation.email == normalized,
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
        )
    )
    if pending is not None:
        raise InvitationError(
            "already_invited", "This e-mail is already invited; send the invitation again."
        )

    code = new_code()
    invitation = Invitation(
        organization_id=teacher.organization_id,
        teacher_id=teacher.id,
        email=normalized,
        display_name=name,
        code_hash=code_hash(code),
        is_minor=is_minor,
        parental_consent_at=now if is_minor else None,
        created_at=now,
        sent_at=now,
        expires_at=now + INVITATION_LIFETIME,
    )
    session.add(invitation)
    session.flush()
    _send(mailer, _invitation_email(teacher, invitation, code))
    return _summary(invitation, now)


def resend(
    session: Session, mailer: Mailer, teacher: Teacher, invitation_id: uuid.UUID
) -> InvitationSummary:
    """A new code and a new validity for a pending or expired invitation; the old code stops
    working."""
    now = datetime.now(UTC)
    invitation = _own_pending(session, teacher, invitation_id)
    code = new_code()
    invitation.code_hash = code_hash(code)
    invitation.sent_at = now
    invitation.expires_at = now + INVITATION_LIFETIME
    session.flush()
    _send(mailer, _invitation_email(teacher, invitation, code))
    return _summary(invitation, now)


def revoke(session: Session, teacher: Teacher, invitation_id: uuid.UUID) -> None:
    invitation = _own_pending(session, teacher, invitation_id)
    invitation.revoked_at = datetime.now(UTC)
    session.flush()


def remove_student(session: Session, teacher: Teacher, student_id: uuid.UUID) -> None:
    """Ends the teacher-student link. A student left without any teacher is disabled and signed
    out, so nobody keeps access to an account no lecturer looks after."""
    link = session.get(TeacherStudent, (teacher.id, student_id))
    if link is None:
        raise InvitationNotFoundError(str(student_id))
    session.delete(link)
    session.flush()
    others = session.scalar(
        select(func.count())
        .select_from(TeacherStudent)
        .where(TeacherStudent.student_id == student_id)
    )
    if not others:
        student = session.get(User, student_id)
        if student is not None:
            student.is_active = False
        session.execute(delete(AuthSession).where(AuthSession.user_id == student_id))
        session.flush()


def list_students(
    session: Session, teacher: Teacher
) -> tuple[list[StudentSummary], list[InvitationSummary]]:
    """The teacher's students (newest first) and their open invitations (pending or expired)."""
    now = datetime.now(UTC)
    rows = session.execute(
        select(User, TeacherStudent.created_at)
        .join(TeacherStudent, TeacherStudent.student_id == User.id)
        .where(TeacherStudent.teacher_id == teacher.id, User.is_active.is_(True))
        .order_by(TeacherStudent.created_at.desc())
    ).all()
    students = [
        StudentSummary(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            is_minor=user.is_minor,
            since=since,
        )
        for user, since in rows
    ]
    invitations = session.scalars(
        select(Invitation)
        .where(
            Invitation.teacher_id == teacher.id,
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
        )
        .order_by(Invitation.sent_at.desc())
    ).all()
    return students, [_summary(invitation, now) for invitation in invitations]


def count_students(session: Session, teacher: Teacher) -> int:
    return (
        session.scalar(
            select(func.count())
            .select_from(TeacherStudent)
            .join(User, User.id == TeacherStudent.student_id)
            .where(TeacherStudent.teacher_id == teacher.id, User.is_active.is_(True))
        )
        or 0
    )
