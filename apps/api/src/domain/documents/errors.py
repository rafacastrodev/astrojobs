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
