class DocumentServiceError(Exception):
    pass


class UnsupportedFileError(DocumentServiceError):
    pass


class FileTooLargeError(DocumentServiceError):
    pass


class ExtractionError(DocumentServiceError):
    pass


class ExtractionConfigurationError(ExtractionError):
    pass


class ExtractionServiceError(DocumentServiceError):
    pass


class UnsafeContentError(DocumentServiceError):
    pass


class SafetyConfigurationError(DocumentServiceError):
    pass


class SafetyServiceError(DocumentServiceError):
    pass


class DocumentNotFoundError(DocumentServiceError):
    pass


class SyncConfigurationError(DocumentServiceError):
    pass


class SearchConfigurationError(DocumentServiceError):
    pass


class StorageError(DocumentServiceError):
    pass


class DuplicateDocumentError(DocumentServiceError):
    pass


class InvalidResumeNameError(DocumentServiceError):
    pass


class JobClosedError(DocumentServiceError):
    def __init__(self) -> None:
        super().__init__("This job is closed")


class PublishedJobCannotBeDeletedError(DocumentServiceError):
    def __init__(self) -> None:
        super().__init__("Published jobs cannot be removed; close the job instead")
