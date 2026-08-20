class EmailAlreadyExistsError(Exception):
    def __init__(self, email: str):
        super().__init__(f"Email already in use: {email}")


class InvalidCredentialsError(Exception):
    def __init__(self):
        super().__init__("Invalid email or password")


class InvalidResetTokenError(Exception):
    def __init__(self):
        super().__init__("Invalid or expired reset token")
