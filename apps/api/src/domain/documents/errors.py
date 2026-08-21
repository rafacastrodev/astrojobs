class DocumentServiceError(Exception):
    pass


class UnsupportedFileError(DocumentServiceError):
    pass


class FileTooLargeError(DocumentServiceError):
    pass


class ExtractionError(DocumentServiceError):
    pass


class DocumentNotFoundError(DocumentServiceError):
    pass


class SyncConfigurationError(DocumentServiceError):
    pass


class StorageError(DocumentServiceError):
    pass
