from aws_cdk import Aws, RemovalPolicy, Stack
from aws_cdk import aws_iam as iam
from aws_cdk import aws_kms as kms
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_secretsmanager as secretsmanager
from constructs import Construct

BUCKET_NAME = "astrojobs-resumes"
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"


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

        self.pinecone_secret = secretsmanager.Secret(
            self,
            "PineconeSecret",
            secret_name="astrojobs/pinecone-kb",
            description=(
                "Pinecone connection info for the astrojobs-kb index. This "
                "shell is populated manually by "
                "scripts/bootstrap_pinecone_index.py — CDK only creates it."
            ),
            encryption_key=self.key,
        )

        self.kb_role = self._build_kb_role()

    def _build_kb_role(self) -> iam.Role:
        role = iam.Role(
            self,
            "KnowledgeBaseRole",
            role_name="AmazonBedrockExecutionRoleForKB-astrojobs",
            assumed_by=iam.ServicePrincipal(
                "bedrock.amazonaws.com",
                conditions={
                    "StringEquals": {"aws:SourceAccount": Aws.ACCOUNT_ID},
                    "ArnLike": {
                        "aws:SourceArn": (
                            f"arn:{Aws.PARTITION}:bedrock:{Aws.REGION}:"
                            f"{Aws.ACCOUNT_ID}:knowledge-base/*"
                        )
                    },
                },
            ),
        )
        role.add_to_policy(
            iam.PolicyStatement(
                actions=["bedrock:InvokeModel"],
                resources=[
                    f"arn:{Aws.PARTITION}:bedrock:{Aws.REGION}::foundation-model/{EMBEDDING_MODEL_ID}"
                ],
            )
        )
        self.bucket.grant_read(role)
        self.pinecone_secret.grant_read(role)
        self.key.grant_decrypt(role)
        return role
