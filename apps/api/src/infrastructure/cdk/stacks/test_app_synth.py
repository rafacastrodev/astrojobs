import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parents[3]
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from aws_cdk import App, Environment
from aws_cdk.assertions import Match, Template

from infrastructure.cdk.stacks.knowledge_base_stack import KnowledgeBaseStack


def _synth_kb_stack() -> Template:
    app = App()
    stack = KnowledgeBaseStack(
        app,
        "TestKnowledgeBase",
        pinecone_connection_string="https://astrojobs-kb-test.svc.us-east-1-aws.pinecone.io",
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
    template.has_resource_properties(
        "AWS::S3::Bucket",
        {
            "BucketEncryption": {
                "ServerSideEncryptionConfiguration": [
                    {
                        "ServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "aws:kms",
                            "KMSMasterKeyID": {
                                "Fn::GetAtt": [
                                    Match.string_like_regexp("KnowledgeBaseKey.*"),
                                    "Arn",
                                ]
                            },
                        }
                    }
                ]
            }
        },
    )
    template.has_resource_properties(
        "AWS::S3::BucketPolicy",
        Match.object_like(
            {
                "PolicyDocument": Match.object_like(
                    {
                        "Statement": Match.array_with(
                            [
                                Match.object_like(
                                    {
                                        "Effect": "Deny",
                                        "Condition": {
                                            "Bool": {"aws:SecureTransport": "false"}
                                        },
                                    }
                                )
                            ]
                        )
                    }
                )
            }
        ),
    )


def test_pinecone_secret_is_imported_not_created():
    """The secret is created out-of-band by the bootstrap script before
    `cdk deploy`, because the KB validates its Pinecone credentials at
    deploy time. CDK only imports it, so no Secret resource is synthesized.
    """
    template = _synth_kb_stack()
    template.resource_count_is("AWS::SecretsManager::Secret", 0)
    template.has_resource_properties(
        "AWS::Bedrock::KnowledgeBase",
        Match.object_like(
            {
                "StorageConfiguration": Match.object_like(
                    {
                        "PineconeConfiguration": Match.object_like(
                            {"CredentialsSecretArn": Match.any_value()}
                        )
                    }
                )
            }
        ),
    )
    synthesized = str(template.to_json())
    assert "astrojobs-pinecone-api-key" in synthesized
    assert "astrojobs/pinecone-kb" not in synthesized


def test_kb_role_trusts_bedrock_with_confused_deputy_conditions():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::IAM::Role",
        {
            "RoleName": "AmazonBedrockExecutionRoleForKB-astrojobs",
            "AssumeRolePolicyDocument": Match.object_like(
                {
                    "Statement": Match.array_with(
                        [
                            Match.object_like(
                                {
                                    "Principal": {"Service": "bedrock.amazonaws.com"},
                                    "Condition": Match.object_like(
                                        {"StringEquals": Match.any_value()}
                                    ),
                                }
                            )
                        ]
                    )
                }
            ),
        },
    )


def test_knowledge_base_uses_pinecone_storage():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Bedrock::KnowledgeBase",
        {
            "Name": "astrojobs-kb",
            "KnowledgeBaseConfiguration": Match.object_like(
                {
                    "VectorKnowledgeBaseConfiguration": Match.object_like(
                        {
                            "EmbeddingModelConfiguration": {
                                "BedrockEmbeddingModelConfiguration": {
                                    "Dimensions": 1024
                                }
                            }
                        }
                    )
                }
            ),
            "StorageConfiguration": Match.object_like(
                {
                    "Type": "PINECONE",
                    "PineconeConfiguration": Match.object_like(
                        {
                            "ConnectionString": "https://astrojobs-kb-test.svc.us-east-1-aws.pinecone.io",
                        }
                    ),
                }
            ),
        },
    )


def test_candidates_data_source_scoped_to_resumes_prefix():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Bedrock::DataSource",
        {
            "Name": "candidates",
            "DataSourceConfiguration": Match.object_like(
                {
                    "Type": "S3",
                    "S3Configuration": Match.object_like(
                        {"InclusionPrefixes": ["resumes/"]}
                    ),
                }
            ),
            "VectorIngestionConfiguration": Match.object_like(
                {
                    "ChunkingConfiguration": Match.object_like(
                        {
                            "ChunkingStrategy": "FIXED_SIZE",
                            "FixedSizeChunkingConfiguration": {
                                "MaxTokens": 300,
                                "OverlapPercentage": 15,
                            },
                        }
                    )
                }
            ),
            "ServerSideEncryptionConfiguration": {
                "KmsKeyArn": {
                    "Fn::GetAtt": [
                        Match.string_like_regexp("KnowledgeBaseKey.*"),
                        "Arn",
                    ]
                }
            },
        },
    )


def test_recruiters_data_source_scoped_to_recruiters_prefix():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Bedrock::DataSource",
        {
            "Name": "recruiters",
            "DataSourceConfiguration": Match.object_like(
                {
                    "Type": "S3",
                    "S3Configuration": Match.object_like(
                        {"InclusionPrefixes": ["recruiters/"]}
                    ),
                }
            ),
        },
    )


def test_guardrail_anonymizes_high_risk_pii():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Bedrock::Guardrail",
        {
            "Name": "astrojobs-pii-guardrail",
            "SensitiveInformationPolicyConfig": Match.object_like(
                {
                    "PiiEntitiesConfig": Match.array_with(
                        [
                            Match.object_like(
                                {
                                    "Type": "US_SOCIAL_SECURITY_NUMBER",
                                    "Action": "ANONYMIZE",
                                }
                            )
                        ]
                    )
                }
            ),
        },
    )
    template.resource_count_is("AWS::Bedrock::GuardrailVersion", 1)


def test_lambda_has_ingestion_permission_scoped_to_the_knowledge_base():
    """`bedrock:StartIngestionJob` must be scoped to the knowledge-base ARN.

    There is no `.../data-source/{id}` ARN resource type in Bedrock's IAM
    model, so scoping to one would deny every ingestion call.
    """
    template = _synth_kb_stack()
    template.has_resource_properties(
        "AWS::Lambda::Function",
        {"Runtime": "python3.12", "Handler": "handler.handler"},
    )
    template.has_resource_properties(
        "AWS::IAM::Policy",
        Match.object_like(
            {
                "PolicyDocument": Match.object_like(
                    {
                        "Statement": Match.array_with(
                            [
                                Match.object_like(
                                    {
                                        "Action": "bedrock:StartIngestionJob",
                                        "Effect": "Allow",
                                        "Resource": {
                                            "Fn::GetAtt": [
                                                "KnowledgeBase",
                                                "KnowledgeBaseArn",
                                            ]
                                        },
                                    }
                                )
                            ]
                        )
                    }
                )
            }
        ),
    )


def test_bucket_notification_filters_on_metadata_sidecars_under_resumes():
    template = _synth_kb_stack()
    template.has_resource_properties(
        "Custom::S3BucketNotifications",
        Match.object_like(
            {
                "BucketName": {"Ref": Match.any_value()},
                "NotificationConfiguration": {
                    "LambdaFunctionConfigurations": [
                        Match.object_like(
                            {
                                "Events": ["s3:ObjectCreated:*"],
                                "Filter": {
                                    "Key": {
                                        "FilterRules": Match.array_with(
                                            [
                                                {
                                                    "Name": "suffix",
                                                    "Value": ".metadata.json",
                                                },
                                                {
                                                    "Name": "prefix",
                                                    "Value": "resumes/",
                                                },
                                            ]
                                        )
                                    }
                                },
                            }
                        )
                    ]
                },
            }
        ),
    )
