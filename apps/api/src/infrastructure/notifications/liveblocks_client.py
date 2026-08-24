import httpx

from domain.notifications.errors import (
    NotificationConfigurationError,
    NotificationDeliveryError,
)
from domain.users.entities import UserEntity

LIVEBLOCKS_API_URL = "https://api.liveblocks.io/v2"


def liveblocks_user_id(user_id: int) -> str:
    return f"astrojobs-user-{user_id}"


class LiveblocksClient:
    def __init__(self, private_key: str, timeout_seconds: float = 8.0):
        self._private_key = private_key.strip()
        self._timeout_seconds = timeout_seconds

    def identify_user(self, user: UserEntity) -> dict[str, str]:
        return self._post(
            "/identify-user",
            {
                "userId": liveblocks_user_id(user.id),
                "userInfo": {"name": user.name},
            },
        )

    def trigger(
        self,
        *,
        user_id: int,
        kind: str,
        subject_id: str,
        activity_data: dict[str, str | int | float | bool],
    ) -> None:
        self._post(
            "/inbox-notifications/trigger",
            {
                "userId": liveblocks_user_id(user_id),
                "kind": kind,
                "subjectId": subject_id,
                "activityData": activity_data,
            },
        )

    def _post(self, path: str, body: dict) -> dict:
        if not self._private_key:
            raise NotificationConfigurationError(
                "Liveblocks notifications are not configured"
            )
        try:
            response = httpx.post(
                f"{LIVEBLOCKS_API_URL}{path}",
                json=body,
                headers={"Authorization": f"Bearer {self._private_key}"},
                timeout=self._timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise NotificationDeliveryError(
                "Liveblocks could not deliver the notification"
            ) from exc
        if not response.content:
            return {}
        try:
            payload = response.json()
        except ValueError as exc:
            raise NotificationDeliveryError(
                "Liveblocks returned an invalid response"
            ) from exc
        if not isinstance(payload, dict):
            raise NotificationDeliveryError("Liveblocks returned an invalid response")
        return payload
