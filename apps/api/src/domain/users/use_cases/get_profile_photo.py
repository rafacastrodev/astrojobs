from domain.documents.file_storage import FileStoragePort
from domain.users.entities import UserEntity
from domain.users.errors import PhotoNotFoundError


class GetProfilePhotoUseCase:
    def __init__(self, storage: FileStoragePort):
        self._storage = storage

    def execute(self, user: UserEntity) -> tuple[bytes, str]:
        if not user.photo_key:
            raise PhotoNotFoundError("No profile photo")
        try:
            return self._storage.get(user.photo_key)
        except FileNotFoundError as exc:
            raise PhotoNotFoundError("No profile photo") from exc
