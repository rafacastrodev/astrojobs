import logging
import uuid

from domain.documents.file_storage import FileStoragePort
from domain.users.entities import UserEntity
from domain.users.errors import PhotoTooLargeError, UnsupportedPhotoError
from domain.users.repository import UserRepository

logger = logging.getLogger(__name__)

MAX_PHOTO_BYTES = 2 * 1024 * 1024
_JPEG = b"\xff\xd8\xff"
_PNG = b"\x89PNG\r\n\x1a\n"


def _image_type(content: bytes) -> tuple[str, str]:
    if content.startswith(_JPEG):
        return "image/jpeg", ".jpg"
    if content.startswith(_PNG):
        return "image/png", ".png"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp", ".webp"
    raise UnsupportedPhotoError("Use a JPEG, PNG, or WebP image")


class UploadProfilePhotoUseCase:
    def __init__(self, users: UserRepository, storage: FileStoragePort):
        self._users = users
        self._storage = storage

    def execute(self, user: UserEntity, content: bytes) -> UserEntity:
        if not content:
            raise UnsupportedPhotoError("The uploaded file is empty")
        if len(content) > MAX_PHOTO_BYTES:
            raise PhotoTooLargeError("Photo is larger than the 2MB limit")
        content_type, extension = _image_type(content)
        storage_key = f"avatars/{user.id}/{uuid.uuid4().hex}{extension}"
        self._storage.upload(content, storage_key, content_type)
        previous = user.photo_key
        updated = self._users.update_photo_key(user.id, storage_key)
        if updated is None:
            self._discard(storage_key)
            raise UnsupportedPhotoError("Could not save the profile photo")
        if previous and previous != storage_key:
            self._discard(previous)
        return updated

    def _discard(self, storage_key: str) -> None:
        try:
            self._storage.delete(storage_key)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to clean up photo %s: %s", storage_key, exc)
