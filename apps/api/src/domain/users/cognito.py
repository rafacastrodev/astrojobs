from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class CognitoIdentity:
    """The claims we trust after a Cognito ID token has been verified."""

    subject: str
    email: str | None
    email_verified: bool
    name: str | None


class CognitoTokenVerifier(Protocol):
    def verify(self, id_token: str) -> CognitoIdentity: ...
