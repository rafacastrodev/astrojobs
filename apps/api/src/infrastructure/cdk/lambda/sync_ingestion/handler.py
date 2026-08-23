import logging
import os

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    client = boto3.client("bedrock-agent")
    knowledge_base_id = os.environ["KNOWLEDGE_BASE_ID"]
    data_source_id = os.environ["CANDIDATES_DATA_SOURCE_ID"]

    for record in event.get("Records", []):
        logger.info("Sidecar object created: %s", record["s3"]["object"]["key"])

    try:
        response = client.start_ingestion_job(
            knowledgeBaseId=knowledge_base_id,
            dataSourceId=data_source_id,
        )
        logger.info(
            "Started ingestion job %s for data source %s",
            response["ingestionJob"]["ingestionJobId"],
            data_source_id,
        )
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "ConflictException":
            logger.warning(
                "Ingestion job already running for data source %s; dropping event",
                data_source_id,
            )
            return
        raise
