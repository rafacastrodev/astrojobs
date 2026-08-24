from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from domain.analysis.use_cases.analyze_resume import AnalyzeResumeUseCase
from domain.analysis.use_cases.list_resume_analyses import ListResumeAnalysesUseCase
from domain.analysis.use_cases.submit_analysis_feedback import (
    SubmitAnalysisFeedbackUseCase,
)
from infrastructure.database.config import settings
from infrastructure.database.session import get_db
from infrastructure.extraction.heuristic_text_extractor import HeuristicTextExtractor
from infrastructure.repositories.sqlalchemy_analysis_repository import (
    SqlAlchemyAnalysisFeedbackRepository,
    SqlAlchemyAnalysisRepository,
)
from infrastructure.repositories.sqlalchemy_document_repository import (
    SqlAlchemyDocumentRepository,
)
from infrastructure.services.openai_resume_analyzer import OpenAIResumeAnalyzer


def get_analyze_resume_use_case(db: Session = Depends(get_db)) -> AnalyzeResumeUseCase:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Resume analysis is not configured",
        )
    return AnalyzeResumeUseCase(
        SqlAlchemyAnalysisRepository(db),
        SqlAlchemyDocumentRepository(db),
        OpenAIResumeAnalyzer(),
        HeuristicTextExtractor(),
    )


def get_list_resume_analyses_use_case(
    db: Session = Depends(get_db),
) -> ListResumeAnalysesUseCase:
    return ListResumeAnalysesUseCase(
        SqlAlchemyAnalysisRepository(db), SqlAlchemyDocumentRepository(db)
    )


def get_submit_analysis_feedback_use_case(
    db: Session = Depends(get_db),
) -> SubmitAnalysisFeedbackUseCase:
    return SubmitAnalysisFeedbackUseCase(
        SqlAlchemyAnalysisRepository(db), SqlAlchemyAnalysisFeedbackRepository(db)
    )
