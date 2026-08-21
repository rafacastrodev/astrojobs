from dataclasses import dataclass, field
from typing import Any

from domain.analysis.repository import AnalysisRepository
from domain.documents.repository import DocumentRepository


@dataclass
class DatasetExport:
    records: list[dict[str, Any]] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


class ExportFeedbackDatasetUseCase:
    """Pairs each reviewed analysis with the input that produced it.

    An analysis only earns a place in the dataset when its input can be
    rebuilt exactly. Pasted job descriptions are never stored, and documents
    can be deleted, so those rows are reported as skipped rather than
    exported against a guessed input.
    """

    def __init__(
        self,
        analysis_repository: AnalysisRepository,
        document_repository: DocumentRepository,
    ):
        self._analyses = analysis_repository
        self._documents = document_repository

    def execute(self) -> DatasetExport:
        export = DatasetExport()

        for analysis in self._analyses.list_with_feedback():
            feedback = analysis.feedback
            if feedback is None:
                continue

            resume = self._documents.get_by_id(analysis.resume_document_id)
            if resume is None:
                export.skipped.append(
                    f"analysis {analysis.id}: resume document "
                    f"{analysis.resume_document_id} no longer exists"
                )
                continue

            if analysis.job_source == "pasted":
                export.skipped.append(
                    f"analysis {analysis.id}: pasted job descriptions are not stored"
                )
                continue

            job = None
            if analysis.job_source == "catalog":
                if analysis.job_document_id is None:
                    export.skipped.append(
                        f"analysis {analysis.id}: the job it compared against was deleted"
                    )
                    continue
                job_document = self._documents.get_by_id(analysis.job_document_id)
                if job_document is None:
                    export.skipped.append(
                        f"analysis {analysis.id}: job document "
                        f"{analysis.job_document_id} no longer exists"
                    )
                    continue
                job = job_document.payload

            export.records.append(
                {
                    "analysis_id": analysis.id,
                    "created_at": analysis.created_at.isoformat(),
                    "input": {"resume": resume.payload, "job": job},
                    "model_output": {
                        "score": analysis.score,
                        "summary": analysis.summary,
                        "findings": analysis.findings,
                    },
                    "review": {
                        "rating": feedback.rating,
                        "expected_score": feedback.expected_score,
                        "comment": feedback.comment,
                    },
                }
            )

        return export
