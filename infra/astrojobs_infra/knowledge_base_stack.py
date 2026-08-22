from aws_cdk import RemovalPolicy, Stack
from aws_cdk import aws_kms as kms
from aws_cdk import aws_s3 as s3
from constructs import Construct

BUCKET_NAME = "astrojobs-resumes"


class KnowledgeBaseStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.key = kms.Key(
            self,
            "KnowledgeBaseKey",
            alias="alias/astrojobs-kb",
            description=(
                "Encrypts the resumes bucket, Bedrock KB transient ingestion "
                "data, and the PII guardrail"
            ),
            enable_key_rotation=True,
            removal_policy=RemovalPolicy.RETAIN,
        )

        self.bucket = s3.Bucket(
            self,
            "ResumesBucket",
            bucket_name=BUCKET_NAME,
            encryption=s3.BucketEncryption.KMS,
            encryption_key=self.key,
            enforce_ssl=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.RETAIN,
        )
