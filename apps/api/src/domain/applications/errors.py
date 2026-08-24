class ApplicationError(Exception):
    pass


class AlreadyAppliedError(ApplicationError):
    def __init__(self) -> None:
        super().__init__("You already applied to this job")


class NoResumeToApplyError(ApplicationError):
    def __init__(self) -> None:
        super().__init__("Upload a resume before applying")
