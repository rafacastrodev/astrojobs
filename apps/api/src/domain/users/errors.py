class EmailAlreadyExistsError(Exception):
    def __init__(self, email: str):
        super().__init__(f"Email already in use: {email}")


class InvalidCredentialsError(Exception):
    def __init__(self):
        super().__init__("Invalid email or password")


class InvalidResetTokenError(Exception):
    def __init__(self):
        super().__init__("Invalid or expired reset token")


class InvalidCognitoTokenError(Exception):
    def __init__(self, reason: str = ""):
        super().__init__(f"Invalid social sign-in token{f': {reason}' if reason else ''}")


class EmailNotVerifiedError(Exception):
    def __init__(self):
        super().__init__(
            "Your social account's email address is not verified, "
            "so it cannot be used to sign in."
        )
