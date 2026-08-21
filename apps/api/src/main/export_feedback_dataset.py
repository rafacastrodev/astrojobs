"""Dump reviewed analyses as JSONL, for prompt evaluation or fine-tuning.

Usage:
    uv run python -m main.export_feedback_dataset --out dataset.jsonl
"""

import argparse
import json
import sys
from pathlib import Path

from domain.analysis.use_cases.export_feedback_dataset import (
    ExportFeedbackDatasetUseCase,
)
from infrastructure.database.session import SessionLocal
from infrastructure.repositories.sqlalchemy_analysis_repository import (
    SqlAlchemyAnalysisRepository,
)
from infrastructure.repositories.sqlalchemy_document_repository import (
    SqlAlchemyDocumentRepository,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        type=Path,
        required=True,
        help="file to write the JSONL dataset to",
    )
    args = parser.parse_args()

    with SessionLocal() as session:
        export = ExportFeedbackDatasetUseCase(
            SqlAlchemyAnalysisRepository(session),
            SqlAlchemyDocumentRepository(session),
        ).execute()

    with args.out.open("w", encoding="utf-8") as handle:
        for record in export.records:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"Wrote {len(export.records)} records to {args.out}")
    for reason in export.skipped:
        print(f"skipped {reason}", file=sys.stderr)
    if export.skipped:
        print(f"Skipped {len(export.skipped)} analyses", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
