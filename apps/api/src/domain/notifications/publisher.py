from typing import Protocol


class NotificationPublisher(Protocol):
    def trigger(
        self,
        *,
        user_id: int,
        kind: str,
        subject_id: str,
        activity_data: dict[str, str | int | float | bool],
    ) -> None: ...


class TransactionManager(Protocol):
    def commit(self) -> None: ...

    def rollback(self) -> None: ...
