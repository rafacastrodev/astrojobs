class ApplicationError(Exception):
    pass


class AlreadyAppliedError(ApplicationError):
    def __init__(self) -> None:
        super().__init__("You already applied to this job")


class NoResumeToApplyError(ApplicationError):
    def __init__(self) -> None:
        super().__init__("Upload a resume before applying")


class ApplicationNotFoundError(ApplicationError):
    def __init__(self) -> None:
        super().__init__("Application not found")


class InvalidApplicationTransitionError(ApplicationError):
    def __init__(self, current: str, target: str) -> None:
        super().__init__(f"Application cannot move from {current} to {target}")
