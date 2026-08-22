import os

from aws_cdk import App, Environment

from astrojobs_infra.knowledge_base_stack import KnowledgeBaseStack

app = App()

env = Environment(
    account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
    region=os.environ.get("CDK_DEFAULT_REGION", "us-east-2"),
)

KnowledgeBaseStack(app, "AstroJobsKnowledgeBase", env=env)

app.synth()
