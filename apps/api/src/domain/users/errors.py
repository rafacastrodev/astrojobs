class EmailAlreadyExistsError(Exception):
    def __init__(self, email: str):
        super().__init__(f"Email already in use: {email}")


class UsernameAlreadyExistsError(Exception):
    def __init__(self, username: str):
        super().__init__(f"Username already in use: {username}")


class InvalidCredentialsError(Exception):
    def __init__(self):
        super().__init__("Invalid email or password")


class InvalidResetTokenError(Exception):
    def __init__(self):
        super().__init__("Invalid or expired reset token")


class EmailNotVerifiedError(Exception):
    def __init__(self):
        super().__init__(
            "Your social account's email address is not verified, "
            "so it cannot be used to sign in."
        )
