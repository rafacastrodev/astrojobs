from aws_cdk import Aws, RemovalPolicy, Stack
from aws_cdk import aws_bedrock as bedrock
from aws_cdk import aws_iam as iam
from aws_cdk import aws_kms as kms
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_secretsmanager as secretsmanager
from constructs import Construct

from astrojobs_infra.sync_lambda_stack import SyncLambdaConstruct

BUCKET_NAME = "astrojobs-resumes"
EMBEDDING_MODEL_ID = "amazon.titan-embed-text-v2:0"
# Must match the Pinecone index dimension created by
# scripts/bootstrap_pinecone_index.py.
EMBEDDING_DIMENSIONS = 1024


class KnowledgeBaseStack(Stack):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        pinecone_connection_string: str,
        **kwargs,
    ) -> None:
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

        # Created and populated out-of-band by
        # scripts/bootstrap_pinecone_index.py before `cdk deploy`: the KB
        # validates its Pinecone credentials at stack-deploy time, so the
        # secret must already hold the API key by then.
        self.pinecone_secret = secretsmanager.Secret.from_secret_name_v2(
            self, "PineconeSecret", "astrojobs/pinecone-kb"
        )

        self.kb_role = self._build_kb_role()

        self.knowledge_base = self._build_knowledge_base(pinecone_connection_string)

        self.candidates_data_source = self._build_data_source(
            "CandidatesDataSource", "candidates", "resumes/"
        )
        self.recruiters_data_source = self._build_data_source(
            "RecruitersDataSource", "recruiters", "recruiters/"
        )

        self.guardrail, self.guardrail_version = self._build_guardrail()

        self.sync_lambda = SyncLambdaConstruct(
            self,
            "SyncLambda",
            bucket=self.bucket,
            knowledge_base=self.knowledge_base,
            candidates_data_source=self.candidates_data_source,
        )

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
        # Ingestion writes transient data encrypted with this key, which needs
        # data-key generation on top of the decrypt that grant_read already
        # covers for reading bucket objects.
        self.key.grant_encrypt_decrypt(role)
        return role

    def _build_knowledge_base(
        self, pinecone_connection_string: str
    ) -> bedrock.CfnKnowledgeBase:
        return bedrock.CfnKnowledgeBase(
            self,
            "KnowledgeBase",
            name="astrojobs-kb",
            description="Candidate and recruiter profiles for semantic search",
            role_arn=self.kb_role.role_arn,
            knowledge_base_configuration=bedrock.CfnKnowledgeBase.KnowledgeBaseConfigurationProperty(
                type="VECTOR",
                vector_knowledge_base_configuration=bedrock.CfnKnowledgeBase.VectorKnowledgeBaseConfigurationProperty(
                    embedding_model_arn=(
                        f"arn:{Aws.PARTITION}:bedrock:{Aws.REGION}::foundation-model/{EMBEDDING_MODEL_ID}"
                    ),
                    embedding_model_configuration=bedrock.CfnKnowledgeBase.EmbeddingModelConfigurationProperty(
                        bedrock_embedding_model_configuration=bedrock.CfnKnowledgeBase.BedrockEmbeddingModelConfigurationProperty(
                            dimensions=EMBEDDING_DIMENSIONS,
                        ),
                    ),
                ),
            ),
            storage_configuration=bedrock.CfnKnowledgeBase.StorageConfigurationProperty(
                type="PINECONE",
                pinecone_configuration=bedrock.CfnKnowledgeBase.PineconeConfigurationProperty(
                    connection_string=pinecone_connection_string,
                    credentials_secret_arn=self.pinecone_secret.secret_arn,
                    field_mapping=bedrock.CfnKnowledgeBase.PineconeFieldMappingProperty(
                        text_field="text",
                        metadata_field="metadata",
                    ),
                ),
            ),
        )

    def _build_data_source(
        self, construct_id: str, name: str, prefix: str
    ) -> bedrock.CfnDataSource:
        return bedrock.CfnDataSource(
            self,
            construct_id,
            name=name,
            knowledge_base_id=self.knowledge_base.attr_knowledge_base_id,
            server_side_encryption_configuration=bedrock.CfnDataSource.ServerSideEncryptionConfigurationProperty(
                kms_key_arn=self.key.key_arn,
            ),
            data_source_configuration=bedrock.CfnDataSource.DataSourceConfigurationProperty(
                type="S3",
                s3_configuration=bedrock.CfnDataSource.S3DataSourceConfigurationProperty(
                    bucket_arn=self.bucket.bucket_arn,
                    inclusion_prefixes=[prefix],
                ),
            ),
            vector_ingestion_configuration=bedrock.CfnDataSource.VectorIngestionConfigurationProperty(
                chunking_configuration=bedrock.CfnDataSource.ChunkingConfigurationProperty(
                    chunking_strategy="FIXED_SIZE",
                    fixed_size_chunking_configuration=bedrock.CfnDataSource.FixedSizeChunkingConfigurationProperty(
                        max_tokens=300,
                        overlap_percentage=15,
                    ),
                ),
            ),
        )

    def _build_guardrail(self) -> tuple[bedrock.CfnGuardrail, bedrock.CfnGuardrailVersion]:
        guardrail = bedrock.CfnGuardrail(
            self,
            "PiiGuardrail",
            name="astrojobs-pii-guardrail",
            description=(
                "Anonymizes high-risk PII (national ID, credit card, bank "
                "account) in retrieval-augmented responses. Not attached to "
                "any inference call yet — ready for the future Bedrock Agent."
            ),
            kms_key_arn=self.key.key_arn,
            blocked_input_messaging=(
                "This request was blocked because it contains sensitive "
                "information that cannot be processed."
            ),
            blocked_outputs_messaging=(
                "The response was blocked because it contains sensitive "
                "information that cannot be returned."
            ),
            sensitive_information_policy_config=bedrock.CfnGuardrail.SensitiveInformationPolicyConfigProperty(
                pii_entities_config=[
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="US_SOCIAL_SECURITY_NUMBER", action="ANONYMIZE"
                    ),
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="CREDIT_DEBIT_CARD_NUMBER", action="ANONYMIZE"
                    ),
                    bedrock.CfnGuardrail.PiiEntityConfigProperty(
                        type="US_BANK_ACCOUNT_NUMBER", action="ANONYMIZE"
                    ),
                ],
            ),
        )
        version = bedrock.CfnGuardrailVersion(
            self,
            "PiiGuardrailVersion",
            guardrail_identifier=guardrail.attr_guardrail_id,
            description="Initial version",
        )
        return guardrail, version
