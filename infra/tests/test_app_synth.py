from aws_cdk import App, Environment
from aws_cdk.assertions import Template

from astrojobs_infra.knowledge_base_stack import KnowledgeBaseStack


def _synth_kb_stack() -> Template:
    app = App()
    stack = KnowledgeBaseStack(
        app,
        "TestKnowledgeBase",
        env=Environment(account="123456789012", region="us-east-2"),
    )
    return Template.from_stack(stack)


def test_stack_synthesizes():
    template = _synth_kb_stack()
    assert template.to_json() is not None


def test_bucket_uses_kms_and_blocks_public_access():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::S3::Bucket",
        {
            "BucketName": "astrojobs-resumes",
            "PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True,
                "BlockPublicPolicy": True,
                "IgnorePublicAcls": True,
                "RestrictPublicBuckets": True,
            },
        },
    )
    template.has_resource_properties(
        "AWS::KMS::Key",
        {"EnableKeyRotation": True},
    )
