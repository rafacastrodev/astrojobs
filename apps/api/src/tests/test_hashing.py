from infrastructure.security.hashing import (
    BcryptPasswordHasher,
    client_password_digest,
    hash_password,
)

PASSWORD = "password1"
PASSWORD_SHA256 = "0b14d501a594442a01c6859541bcb3e8164d183d32937b851835442f69d5c94e"


def test_client_digest_hashes_plaintext() -> None:
    assert client_password_digest(PASSWORD) == PASSWORD_SHA256


def test_client_digest_keeps_sha256_hex() -> None:
    assert client_password_digest(PASSWORD_SHA256) == PASSWORD_SHA256


def test_hasher_accepts_plaintext_and_client_sha256() -> None:
    hasher = BcryptPasswordHasher()
    stored = hasher.hash(PASSWORD)

    assert hasher.verify(PASSWORD, stored)
    assert hasher.verify(PASSWORD_SHA256, stored)
    assert not hasher.verify("password2", stored)


def test_hasher_verifies_legacy_bcrypt_of_plaintext() -> None:
    hasher = BcryptPasswordHasher()
    stored = hash_password(PASSWORD)

    assert hasher.verify(PASSWORD, stored)
    assert not hasher.verify(PASSWORD_SHA256, stored)
