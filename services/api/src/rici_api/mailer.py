"""Outgoing e-mail (invitations). SMTP in every environment; Mailpit catches it in development."""

import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Protocol


class MailError(Exception):
    """An e-mail could not be handed to the mail server."""


@dataclass(frozen=True)
class Email:
    to: str
    subject: str
    text: str


class Mailer(Protocol):
    def send(self, email: Email) -> None:
        """Delivers the e-mail or raises MailError."""


@dataclass(frozen=True)
class SmtpMailer:
    host: str
    port: int
    sender: str
    username: str | None = None
    password: str | None = None
    starttls: bool = False
    timeout_seconds: float = 10

    def send(self, email: Email) -> None:
        message = EmailMessage()
        message["From"] = self.sender
        message["To"] = email.to
        message["Subject"] = email.subject
        message.set_content(email.text)
        try:
            with smtplib.SMTP(self.host, self.port, timeout=self.timeout_seconds) as smtp:
                if self.starttls:
                    smtp.starttls(context=ssl.create_default_context())
                if self.username and self.password:
                    smtp.login(self.username, self.password)
                smtp.send_message(message)
        except (OSError, smtplib.SMTPException) as error:
            raise MailError(f"Cannot send e-mail: {error}") from error


class UnconfiguredMailer:
    """Used when SMTP_HOST is not set: every attempt fails with a clear message."""

    def send(self, email: Email) -> None:
        raise MailError("E-mail is not configured (set SMTP_HOST).")
