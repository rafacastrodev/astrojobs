"""One-time script: creates the Pinecone serverless index the Knowledge
Base connects to, and populates the AWS secret holding its API key.

Both must exist *before* `cdk deploy`: Pinecone is third-party SaaS that CDK
cannot provision, and the Bedrock Knowledge Base validates its Pinecone
credentials when the stack creates it — so the secret cannot be a shell that
CDK creates and someone fills in afterwards. CDK imports the secret by name
instead.

Order of operations:

1. Run this script — it creates the Pinecone index AND the AWS secret:

     PINECONE_API_KEY=<key> uv run python scripts/bootstrap_pinecone_index.py

2. Export the printed host:

     export PINECONE_CONNECTION_STRING=<printed-host>

3. Then deploy:

     npx cdk deploy

Re-running is safe: an existing index and an existing secret are both reused.
"""

import json
import os

import boto3
from botocore.exceptions import ClientError
from pinecone import Pinecone, ServerlessSpec

INDEX_NAME = "astrojobs-kb"
DIMENSION = 1024
CLOUD = "aws"
REGION = os.environ.get("PINECONE_REGION", "us-east-1")
SECRET_NAME = "astrojobs/pinecone-kb"
SECRET_DESCRIPTION = (
    "Pinecone API key for the astrojobs-kb index, read by the Bedrock "
    "Knowledge Base. Created by scripts/bootstrap_pinecone_index.py."
)


def _ensure_secret(api_key: str) -> None:
    """Create the secret, or overwrite its value if it already exists."""
    client = boto3.client("secretsmanager")
    secret_string = json.dumps({"apiKey": api_key})
    try:
        client.create_secret(
            Name=SECRET_NAME,
            Description=SECRET_DESCRIPTION,
            SecretString=secret_string,
        )
        print(f"Created secret '{SECRET_NAME}'.")
    except client.exceptions.ResourceExistsException:
        client.put_secret_value(SecretId=SECRET_NAME, SecretString=secret_string)
        print(f"Secret '{SECRET_NAME}' already exists, stored a new value.")
    except ClientError as exc:
        raise SystemExit(f"Could not write secret '{SECRET_NAME}': {exc}") from exc


def main() -> None:
    api_key = os.environ["PINECONE_API_KEY"]
    client = Pinecone(api_key=api_key)

    if client.has_index(INDEX_NAME):
        print(f"Index '{INDEX_NAME}' already exists, skipping creation.")
    else:
        client.create_index(
            name=INDEX_NAME,
            dimension=DIMENSION,
            metric="cosine",
            spec=ServerlessSpec(cloud=CLOUD, region=REGION),
        )
        print(f"Created index '{INDEX_NAME}' ({DIMENSION} dims, {CLOUD}/{REGION}).")

    _ensure_secret(api_key)

    description = client.describe_index(INDEX_NAME)
    print(f"\nHost: {description.host}")
    print("Export before 'cdk deploy':")
    print(f"  export PINECONE_CONNECTION_STRING={description.host}")


if __name__ == "__main__":
    main()
