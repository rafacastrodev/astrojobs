from domain.users.cognito import CognitoIdentity, CognitoTokenVerifier
from domain.users.entities import UserEntity
from domain.users.errors import EmailNotVerifiedError, InvalidCognitoTokenError
from domain.users.repository import UserRepository
from domain.users.security import TokenService


class AuthenticateWithCognitoUseCase:
    """Turns a verified Cognito ID token into an AstroJobs session.

    Social sign-in does not create a second kind of session: the outcome is the
    same JWT the password flow issues, so route guards and the API behave
    identically no matter how the user signed in.
    """

    def __init__(
        self,
        user_repository: UserRepository,
        verifier: CognitoTokenVerifier,
        token_service: TokenService,
    ):
        self._users = user_repository
        self._verifier = verifier
        self._tokens = token_service

    def execute(self, id_token: str) -> tuple[UserEntity, str]:
        identity = self._verifier.verify(id_token)
        user = self._resolve_user(identity)
        return user, self._tokens.create_access_token(user.id)

    def _resolve_user(self, identity: CognitoIdentity) -> UserEntity:
        # A known subject is already proven to own this account.
        existing = self._users.get_by_cognito_sub(identity.subject)
        if existing is not None:
            return existing

        if not identity.email:
            raise InvalidCognitoTokenError("Token has no email claim")

        # Everything below keys off the email address, which is only
        # trustworthy once the provider says it verified it. Skipping this
        # check would let anyone who can mint an unverified-email identity at
        # any federated provider claim someone else's account.
        if not identity.email_verified:
            raise EmailNotVerifiedError()

        by_email = self._users.get_by_email(identity.email)
        if by_email is not None:
            return self._users.link_cognito_sub(by_email.id, identity.subject)

        return self._users.create_social(
            name=identity.name or identity.email.split("@")[0],
            email=identity.email,
            cognito_sub=identity.subject,
        )
