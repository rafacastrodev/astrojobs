from domain.analysis.entities import AnalysisFeedbackEntity, FeedbackRating
from domain.analysis.errors import AnalysisNotFoundError, InvalidFeedbackError
from domain.analysis.repository import AnalysisFeedbackRepository, AnalysisRepository

MAX_COMMENT_CHARS = 2_000


class SubmitAnalysisFeedbackUseCase:
    def __init__(
        self,
        analysis_repository: AnalysisRepository,
        feedback_repository: AnalysisFeedbackRepository,
    ):
        self._analyses = analysis_repository
        self._feedback = feedback_repository

    def execute(
        self,
        user_id: int,
        analysis_id: int,
        rating: FeedbackRating,
        expected_score: int | None = None,
        comment: str | None = None,
    ) -> AnalysisFeedbackEntity:
        analysis = self._analyses.get_by_id(analysis_id)
        if analysis is None or analysis.user_id != user_id:
            raise AnalysisNotFoundError(f"Analysis {analysis_id} not found")

        if expected_score is not None and not 0 <= expected_score <= 100:
            raise InvalidFeedbackError("expected_score must be between 0 and 100")

        comment = comment.strip() if comment else None
        if comment is not None and len(comment) > MAX_COMMENT_CHARS:
            raise InvalidFeedbackError(
                f"comment is longer than the {MAX_COMMENT_CHARS} character limit"
            )

        return self._feedback.upsert(
            analysis_id=analysis_id,
            rating=rating,
            expected_score=expected_score,
            comment=comment or None,
        )
