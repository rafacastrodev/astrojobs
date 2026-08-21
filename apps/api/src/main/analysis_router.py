from fastapi import APIRouter, Depends, HTTPException, status

from domain.analysis.entities import AnalysisEntity
from domain.analysis.errors import (
    AnalyzerConfigurationError,
    AnalyzerError,
    InvalidJobSourceError,
)
from domain.analysis.use_cases.analyze_resume import AnalyzeResumeUseCase
from domain.analysis.use_cases.list_resume_analyses import ListResumeAnalysesUseCase
from domain.documents.errors import DocumentNotFoundError
from domain.users.entities import UserEntity
from infrastructure.analysis.dependencies import (
    get_analyze_resume_use_case,
    get_list_resume_analyses_use_case,
)
from infrastructure.schemas.analysis_schemas import (
    AnalysisResponse,
    AnalyzeResumeRequest,
)
from infrastructure.users.dependencies import get_current_user

router = APIRouter(prefix="/analysis", tags=["analysis"])


def _to_response(analysis: AnalysisEntity) -> AnalysisResponse:
    return AnalysisResponse(
        id=analysis.id,  # type: ignore[arg-type]
        resume_document_id=analysis.resume_document_id,
        job_source=analysis.job_source,
        job_document_id=analysis.job_document_id,
        job_title=analysis.job_title,
        score=analysis.score,
        summary=analysis.summary,
        findings=analysis.findings,
        created_at=analysis.created_at,
    )


@router.post(
    "/resumes/{resume_id}", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED
)
def analyze_resume(
    resume_id: int,
    body: AnalyzeResumeRequest,
    user: UserEntity = Depends(get_current_user),
    use_case: AnalyzeResumeUseCase = Depends(get_analyze_resume_use_case),
) -> AnalysisResponse:
    try:
        analysis = use_case.execute(
            user_id=user.id,
            resume_document_id=resume_id,
            job_source=body.job_source,
            job_document_id=body.job_document_id,
            job_text=body.job_text,
        )
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvalidJobSourceError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except AnalyzerConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except AnalyzerError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    return _to_response(analysis)


@router.get("/resumes/{resume_id}", response_model=list[AnalysisResponse])
def list_resume_analyses(
    resume_id: int,
    user: UserEntity = Depends(get_current_user),
    use_case: ListResumeAnalysesUseCase = Depends(get_list_resume_analyses_use_case),
) -> list[AnalysisResponse]:
    try:
        analyses = use_case.execute(resume_id, user.id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [_to_response(analysis) for analysis in analyses]
