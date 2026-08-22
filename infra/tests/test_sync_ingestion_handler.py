import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lambda" / "sync_ingestion"))

os.environ["KNOWLEDGE_BASE_ID"] = "kb-test"
os.environ["CANDIDATES_DATA_SOURCE_ID"] = "ds-test"

import handler  # noqa: E402


def _event():
    return {"Records": [{"s3": {"object": {"key": "resumes/1/abc.pdf.metadata.json"}}}]}


@patch("handler.boto3.client")
def test_starts_ingestion_job(mock_boto_client):
    mock_client = MagicMock()
    mock_client.start_ingestion_job.return_value = {
        "ingestionJob": {"ingestionJobId": "job-1"}
    }
    mock_boto_client.return_value = mock_client

    handler.handler(_event(), None)

    mock_client.start_ingestion_job.assert_called_once_with(
        knowledgeBaseId="kb-test", dataSourceId="ds-test"
    )


@patch("handler.boto3.client")
def test_drops_event_on_conflict(mock_boto_client):
    mock_client = MagicMock()
    mock_client.start_ingestion_job.side_effect = ClientError(
        {"Error": {"Code": "ConflictException", "Message": "already running"}},
        "StartIngestionJob",
    )
    mock_boto_client.return_value = mock_client

    handler.handler(_event(), None)  # must not raise


@patch("handler.boto3.client")
def test_reraises_other_client_errors(mock_boto_client):
    mock_client = MagicMock()
    mock_client.start_ingestion_job.side_effect = ClientError(
        {"Error": {"Code": "ThrottlingException", "Message": "slow down"}},
        "StartIngestionJob",
    )
    mock_boto_client.return_value = mock_client

    try:
        handler.handler(_event(), None)
        raise AssertionError("expected ClientError to propagate")
    except ClientError:
        pass
