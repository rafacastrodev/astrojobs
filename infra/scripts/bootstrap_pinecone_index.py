"""One-time script: creates the Pinecone serverless index the Knowledge
Base connects to. Pinecone is third-party SaaS — CDK cannot provision it.

Run once, before the first `cdk deploy`:

    PINECONE_API_KEY=<key> uv run python scripts/bootstrap_pinecone_index.py

Then, using the printed host:
1. Export it before `cdk deploy`:
     export PINECONE_CONNECTION_STRING=<printed-host>
2. Put the API key into the secret CDK creates:
     aws secretsmanager put-secret-value \\
       --secret-id astrojobs/pinecone-kb \\
       --secret-string '{"apiKey":"<key>"}'
"""

import os

from pinecone import Pinecone, ServerlessSpec

INDEX_NAME = "astrojobs-kb"
DIMENSION = 1024
CLOUD = "aws"
REGION = os.environ.get("PINECONE_REGION", "us-east-1")


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

    description = client.describe_index(INDEX_NAME)
    print(f"\nHost: {description.host}")
    print("Export before 'cdk deploy':")
    print(f"  export PINECONE_CONNECTION_STRING={description.host}")


if __name__ == "__main__":
    main()
