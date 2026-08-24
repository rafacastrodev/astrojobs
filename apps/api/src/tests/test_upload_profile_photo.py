from datetime import UTC, datetime

import pytest

from domain.users.entities import UserEntity
from domain.users.errors import PhotoTooLargeError, UnsupportedPhotoError
from domain.users.use_cases.upload_profile_photo import (
    MAX_PHOTO_BYTES,
    UploadProfilePhotoUseCase,
)


class _Users:
    def __init__(self, user: UserEntity):
        self.user = user

    def update_photo_key(self, _user_id, photo_key):
        self.user.photo_key = photo_key
        return self.user


class _Storage:
    def __init__(self):
        self.objects: dict[str, tuple[bytes, str]] = {}

    def upload(self, content, key, content_type):
        self.objects[key] = (content, content_type)

    def get(self, key):
        return self.objects[key]

    def delete(self, key):
        self.objects.pop(key, None)


def _user(photo_key=None):
    return UserEntity(
        id=7,
        name="hashpro",
        email="pro@example.com",
        hashed_password="hashed",
        role="professional",
        created_at=datetime.now(UTC),
        photo_key=photo_key,
    )


def test_upload_profile_photo_stores_jpeg_in_s3() -> None:
    user = _user()
    storage = _Storage()
    updated = UploadProfilePhotoUseCase(_Users(user), storage).execute(
        user, b"\xff\xd8\xff" + b"jpeg"
    )
    assert updated.photo_key is not None
    assert updated.photo_key.startswith("avatars/7/")
    assert updated.photo_key.endswith(".jpg")
    assert storage.objects[updated.photo_key][1] == "image/jpeg"


def test_upload_profile_photo_replaces_previous_object() -> None:
    user = _user("avatars/7/old.jpg")
    storage = _Storage()
    storage.objects["avatars/7/old.jpg"] = (b"old", "image/jpeg")
    updated = UploadProfilePhotoUseCase(_Users(user), storage).execute(
        user, b"\x89PNG\r\n\x1a\n" + b"png"
    )
    assert "avatars/7/old.jpg" not in storage.objects
    assert updated.photo_key.endswith(".png")


def test_upload_profile_photo_rejects_non_image() -> None:
    with pytest.raises(UnsupportedPhotoError):
        UploadProfilePhotoUseCase(_Users(_user()), _Storage()).execute(
            _user(), b"%PDF-1.7"
        )


def test_upload_profile_photo_rejects_large_file() -> None:
    with pytest.raises(PhotoTooLargeError):
        UploadProfilePhotoUseCase(_Users(_user()), _Storage()).execute(
            _user(), b"\xff\xd8\xff" + b"x" * MAX_PHOTO_BYTES
        )
