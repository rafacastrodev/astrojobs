import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from aws_cdk import App, Environment

from infrastructure.cdk.stacks.knowledge_base_stack import KnowledgeBaseStack

app = App()

env = Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "us-east-2"),
)

pinecone_connection_string = os.environ["PINECONE_CONNECTION_STRING"]

KnowledgeBaseStack(
    app,
    "AstroJobsKnowledgeBase",
    pinecone_connection_string=pinecone_connection_string,
    env=env,
)

app.synth()
