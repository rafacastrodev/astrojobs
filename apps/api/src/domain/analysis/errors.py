class AnalysisServiceError(Exception):
    pass


class InvalidJobSourceError(AnalysisServiceError):
    pass


class AnalyzerConfigurationError(AnalysisServiceError):
    pass


class AnalyzerError(AnalysisServiceError):
    pass


class AnalysisNotFoundError(AnalysisServiceError):
    pass


class InvalidFeedbackError(AnalysisServiceError):
    pass
