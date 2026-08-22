from aws_cdk import Duration
from aws_cdk import aws_bedrock as bedrock
from aws_cdk import aws_iam as iam
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_notifications as s3n
from constructs import Construct


class SyncLambdaConstruct(Construct):
    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        bucket: s3.Bucket,
        knowledge_base: bedrock.CfnKnowledgeBase,
        candidates_data_source: bedrock.CfnDataSource,
    ) -> None:
        super().__init__(scope, construct_id)

        function = lambda_.Function(
            self,
            "SyncIngestionTrigger",
            function_name="sync-ingestion-trigger",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.handler",
            code=lambda_.Code.from_asset("lambda/sync_ingestion"),
            timeout=Duration.seconds(30),
            environment={
                "KNOWLEDGE_BASE_ID": knowledge_base.attr_knowledge_base_id,
                "CANDIDATES_DATA_SOURCE_ID": candidates_data_source.attr_data_source_id,
            },
        )

        data_source_arn = (
            f"{knowledge_base.attr_knowledge_base_arn}/data-source/"
            f"{candidates_data_source.attr_data_source_id}"
        )
        function.add_to_role_policy(
            iam.PolicyStatement(
                actions=["bedrock:StartIngestionJob"],
                resources=[data_source_arn],
            )
        )

        bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(function),
            s3.NotificationKeyFilter(prefix="resumes/", suffix=".metadata.json"),
        )
