class OfferError(Exception):
    pass


class AlreadyOfferedError(OfferError):
    def __init__(self) -> None:
        super().__init__("This job was already offered to this professional")


class CannotOfferApplicantError(OfferError):
    def __init__(self) -> None:
        super().__init__("This professional already applied to the job")


class InvalidOfferMessageError(OfferError):
    pass
