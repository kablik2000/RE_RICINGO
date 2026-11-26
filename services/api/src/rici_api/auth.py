"""Accounts and sign-in: teachers in the Studio (ADR-0012), shared parts for students (ADR-0013).

- Passwords: Argon2id (argon2-cffi defaults, RFC 9106 low-memory profile), 15-128 characters
  (NIST SP 800-63B-4 for single-factor passwords), no composition rules.
- Sign-in answers the same for an unknown e-mail and a wrong password, and takes about as
  long (a dummy hash is verified), so accounts cannot be discovered.
- Throttling: after 5 failures for one e-mail within 15 minutes that e-mail is blocked for the
  rest of the window, whether the account exists or not; one address is blocked after 50.
- Sessions: a 256-bit random token; only its SHA-256 is stored. They end after 2 hours without
  use or 12 hours after sign-in, on sign-out, and when the password changes (a teacher who
  changes their own password stays signed in on that session only).
"""

import hashlib
import re
import secrets
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from sqlalchemy import delete, func, select
from sqlalchemy.orm import InstrumentedAttribute, Session

from rici_api.models import AuthSession, LoginAttempt, Organization, User

PASSWORD_MIN_LENGTH = 15
PASSWORD_MAX_LENGTH = 128
SESSION_IDLE_TIMEOUT = timedelta(hours=2)
SESSION_LIFETIME = timedelta(hours=12)
THROTTLE_WINDOW = timedelta(minutes=15)
MAX_FAILURES_PER_EMAIL = 5
MAX_FAILURES_PER_ADDRESS = 50
# A session's last use is written at most this often (fewer writes on every request).
LAST_SEEN_PRECISION = timedelta(minutes=1)
ATTEMPT_RETENTION = timedelta(days=1)
TEACHER = "teacher"
STUDENT = "student"

_hasher = PasswordHasher()
# Verified when the e-mail is unknown, so a failed sign-in always costs one Argon2 check.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(32))
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AccountError(Exception):
    """An account cannot be created or changed as asked (operator commands)."""


class InvalidCredentialsError(Exception):
    """Wrong e-mail or password, or an inactive account. Deliberately not more specific."""


class WeakPasswordError(Exception):
    """A new password does not meet the rules; `code` says which (see `password_issue`)."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class TooManyAttemptsError(Exception):
    """Sign-in is throttled for this e-mail or address."""

    def __init__(self, retry_after: timedelta) -> None:
        super().__init__("Too many failed sign-in attempts.")
        self.retry_after_seconds = max(1, int(retry_after.total_seconds()) + 1)


@dataclass(frozen=True)
class Teacher:
    id: uuid.UUID
    organization_id: uuid.UUID
    email: str
    display_name: str


@dataclass(frozen=True)
class SessionPolicy:
    """How long a session of one role lasts."""

    idle_timeout: timedelta
    lifetime: timedelta


TEACHER_SESSIONS = SessionPolicy(idle_timeout=SESSION_IDLE_TIMEOUT, lifetime=SESSION_LIFETIME)
# Students stay signed in on their own devices (ADR-0013).
STUDENT_SESSIONS = SessionPolicy(idle_timeout=timedelta(days=60), lifetime=timedelta(days=365))


@dataclass(frozen=True)
class SignedIn:
    token: str
    expires_at: datetime
    teacher: Teacher


def normalize_email(email: str) -> str:
    return unicodedata.normalize("NFKC", email).strip().lower()


def _email_key(email: str) -> str:
    return hashlib.sha256(normalize_email(email).encode("utf-8")).hexdigest()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _normalize_password(password: str) -> str:
    return unicodedata.normalize("NFKC", password)


def password_issue(password: str, email: str, min_length: int = PASSWORD_MIN_LENGTH) -> str | None:
    """Why a new password is not acceptable, as an error code (`password_too_short`, ...), or
    None. The codes are part of the API (Studio shows its own message for each)."""
    normalized = _normalize_password(password)
    if len(normalized) < min_length:
        return "password_too_short"
    if len(normalized) > PASSWORD_MAX_LENGTH:
        return "password_too_long"
    if normalized.strip().lower() == normalize_email(email):
        return "password_is_email"
    if len(set(normalized)) < 4:
        return "password_too_repetitive"
    return None


def password_problem(
    password: str, email: str, min_length: int = PASSWORD_MIN_LENGTH
) -> str | None:
    """Why a new password is not acceptable, as a sentence (operator commands), or None."""
    issue = password_issue(password, email, min_length)
    messages = {
        "password_too_short": f"The password must have at least {min_length} characters.",
        "password_too_long": f"The password must have at most {PASSWORD_MAX_LENGTH} characters.",
        "password_is_email": "The password must not be the e-mail address.",
        "password_too_repetitive": "The password repeats too few characters.",
    }
    return None if issue is None else messages[issue]


def hash_password(password: str) -> str:
    return _hasher.hash(_normalize_password(password))


def _teacher(user: User) -> Teacher:
    return Teacher(
        id=user.id,
        organization_id=user.organization_id,
        email=user.email,
        display_name=user.display_name,
    )


def create_teacher(
    session: Session, email: str, display_name: str, organization: str, password: str
) -> Teacher:
    """Creates a teacher account (operator command); the organization is created if new."""
    normalized = normalize_email(email)
    if not _EMAIL.match(normalized) or len(normalized) > 254:
        raise AccountError("Not a valid e-mail address.")
    if not display_name.strip() or not organization.strip():
        raise AccountError("The name and the organization are required.")
    if (problem := password_problem(password, normalized)) is not None:
        raise AccountError(problem)
    if session.scalar(select(User.id).where(User.email == normalized)) is not None:
        raise AccountError("An account with this e-mail already exists.")
    org = session.scalar(select(Organization).where(Organization.name == organization.strip()))
    if org is None:
        org = Organization(name=organization.strip())
        session.add(org)
        session.flush()
    user = User(
        organization_id=org.id,
        email=normalized,
        display_name=display_name.strip(),
        role=TEACHER,
        password_hash=hash_password(password),
    )
    session.add(user)
    session.flush()
    return _teacher(user)


def end_all_sessions(session: Session, user_id: uuid.UUID) -> None:
    session.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
    session.flush()


def set_password(session: Session, email: str, password: str) -> None:
    """Replaces a password (operator command) and ends all of the account's sessions."""
    user = session.scalar(select(User).where(User.email == normalize_email(email)))
    if user is None:
        raise AccountError("No account with this e-mail.")
    if (problem := password_problem(password, user.email)) is not None:
        raise AccountError(problem)
    user.password_hash = hash_password(password)
    user.password_changed_at = datetime.now(UTC)
    end_all_sessions(session, user.id)


def change_password(
    session: Session, token: str, current_password: str, new_password: str, address: str
) -> None:
    """A signed-in teacher replaces their own password. The current password is checked like a
    sign-in (throttled, recorded; commit even when it raises InvalidCredentialsError). Every
    other session of the account ends; the one that asked stays signed in.
    Raises InvalidCredentialsError (no session, or wrong current password), WeakPasswordError,
    TooManyAttemptsError."""
    found = resolve_session(session, token, TEACHER, TEACHER_SESSIONS)
    if found is None:
        raise InvalidCredentialsError
    current_session, user = found
    if (issue := password_issue(new_password, user.email)) is not None:
        raise WeakPasswordError(issue)
    check_password(session, user.email, current_password, address, TEACHER)
    user.password_hash = hash_password(new_password)
    user.password_changed_at = datetime.now(UTC)
    session.execute(
        delete(AuthSession).where(
            AuthSession.user_id == user.id, AuthSession.id != current_session.id
        )
    )
    session.flush()


def set_active(session: Session, email: str, active: bool) -> None:
    """Enables or disables an account (operator command); disabling ends its sessions."""
    user = session.scalar(select(User).where(User.email == normalize_email(email)))
    if user is None:
        raise AccountError("No account with this e-mail.")
    user.is_active = active
    if not active:
        end_all_sessions(session, user.id)
    session.flush()


def _recent_failures(
    session: Session, column: InstrumentedAttribute[str], value: str, since: datetime
) -> list[datetime]:
    """Failure times for one e-mail key or address since `since`, newest first."""
    return list(
        session.scalars(
            select(LoginAttempt.created_at)
            .where(column == value, LoginAttempt.succeeded.is_(False))
            .where(LoginAttempt.created_at > since)
            .order_by(LoginAttempt.created_at.desc())
        )
    )


def _raise_if_over(failures: list[datetime], limit: int, now: datetime) -> None:
    if len(failures) >= limit:
        # Blocked until the oldest failure that counts towards the limit leaves the window.
        raise TooManyAttemptsError(failures[limit - 1] + THROTTLE_WINDOW - now)


def throttle_address(session: Session, address: str, limit: int) -> None:
    """Raises TooManyAttemptsError when `address` failed `limit` times in the window."""
    now = datetime.now(UTC)
    since = now - THROTTLE_WINDOW
    _raise_if_over(_recent_failures(session, LoginAttempt.address, address[:64], since), limit, now)


def record_attempt(session: Session, key: str, address: str, succeeded: bool) -> None:
    """Records one attempt; `key` is an e-mail key or a fixed name such as "invitation-code"."""
    session.add(
        LoginAttempt(
            email_key=key, address=address[:64], succeeded=succeeded, created_at=datetime.now(UTC)
        )
    )
    session.flush()


def _throttle(session: Session, email_key: str, address: str, now: datetime) -> None:
    """Raises TooManyAttemptsError while the e-mail or the address is over its limit."""
    since = now - THROTTLE_WINDOW
    last_success = session.scalar(
        select(func.max(LoginAttempt.created_at)).where(
            LoginAttempt.email_key == email_key, LoginAttempt.succeeded.is_(True)
        )
    )
    email_since = max(since, last_success) if last_success is not None else since
    _raise_if_over(
        _recent_failures(session, LoginAttempt.email_key, email_key, email_since),
        MAX_FAILURES_PER_EMAIL,
        now,
    )
    _raise_if_over(
        _recent_failures(session, LoginAttempt.address, address, since),
        MAX_FAILURES_PER_ADDRESS,
        now,
    )


def check_password(session: Session, email: str, password: str, address: str, role: str) -> User:
    """The active account of `role` with these credentials. Throttled per e-mail and address;
    records the attempt. Commit even when it raises InvalidCredentialsError: the failed attempt
    must be kept."""
    now = datetime.now(UTC)
    email_key = _email_key(email)
    address = address[:64]
    session.execute(delete(LoginAttempt).where(LoginAttempt.created_at < now - ATTEMPT_RETENTION))
    _throttle(session, email_key, address, now)

    user = session.scalar(select(User).where(User.email == normalize_email(email)))
    normalized_password = _normalize_password(password)[: PASSWORD_MAX_LENGTH + 1]
    valid = False
    try:
        valid = _hasher.verify(user.password_hash if user else _DUMMY_HASH, normalized_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        valid = False
    succeeded = valid and user is not None and user.is_active and user.role == role
    record_attempt(session, email_key, address, succeeded)
    if not succeeded or user is None:
        raise InvalidCredentialsError
    if _hasher.check_needs_rehash(user.password_hash):
        user.password_hash = _hasher.hash(normalized_password)
    return user


def open_session(
    session: Session, user: User, policy: SessionPolicy, device_name: str | None = None
) -> tuple[str, datetime]:
    """A new session for `user`: returns the token (shown once) and when it expires."""
    now = datetime.now(UTC)
    session.execute(
        delete(AuthSession).where(AuthSession.user_id == user.id, AuthSession.expires_at < now)
    )
    token = secrets.token_urlsafe(32)
    expires_at = now + policy.lifetime
    session.add(
        AuthSession(
            user_id=user.id,
            token_hash=_token_hash(token),
            device_name=device_name,
            created_at=now,
            last_seen_at=now,
            expires_at=expires_at,
        )
    )
    session.flush()
    return token, expires_at


def resolve_session(
    session: Session, token: str, role: str, policy: SessionPolicy
) -> tuple[AuthSession, User] | None:
    """The session and account for a token of `role`, or None (unknown, expired, idle, other
    role, inactive account). Ended sessions are deleted."""
    if not token or len(token) > 128:
        return None
    now = datetime.now(UTC)
    found = session.execute(
        select(AuthSession, User)
        .join(User, User.id == AuthSession.user_id)
        .where(AuthSession.token_hash == _token_hash(token))
    ).first()
    if found is None:
        return None
    auth_session, user = found
    if user.role != role:
        return None
    expired = (
        now >= auth_session.expires_at or now - auth_session.last_seen_at >= policy.idle_timeout
    )
    if expired or not user.is_active:
        session.delete(auth_session)
        session.flush()
        return None
    if now - auth_session.last_seen_at >= LAST_SEEN_PRECISION:
        auth_session.last_seen_at = now
        session.flush()
    return auth_session, user


def sign_in(session: Session, email: str, password: str, address: str) -> SignedIn:
    """Teacher sign-in (Studio). Commit even when it raises InvalidCredentialsError."""
    user = check_password(session, email, password, address, TEACHER)
    token, expires_at = open_session(session, user, TEACHER_SESSIONS)
    return SignedIn(token=token, expires_at=expires_at, teacher=_teacher(user))


def authenticate(session: Session, token: str) -> Teacher | None:
    """The teacher a session token belongs to, or None (unknown, expired or idle session)."""
    found = resolve_session(session, token, TEACHER, TEACHER_SESSIONS)
    return None if found is None else _teacher(found[1])


def sign_out(session: Session, token: str) -> None:
    session.execute(delete(AuthSession).where(AuthSession.token_hash == _token_hash(token)))
    session.flush()
