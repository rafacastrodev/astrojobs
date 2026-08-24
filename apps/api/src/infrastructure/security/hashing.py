import hashlib
import re

import bcrypt

_CLIENT_PASSWORD_HASH = re.compile(r"^[0-9a-f]{64}$")


def client_password_digest(password: str) -> str:
    if _CLIENT_PASSWORD_HASH.fullmatch(password):
        return password
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


class BcryptPasswordHasher:
    def hash(self, password: str) -> str:
        return hash_password(client_password_digest(password))

    def verify(self, password: str, hashed_password: str) -> bool:
        digest = client_password_digest(password)
        if verify_password(digest, hashed_password):
            return True
        return digest != password and verify_password(password, hashed_password)
