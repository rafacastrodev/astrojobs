import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from infrastructure.database.config import settings


class S3FileStorage:
    def __init__(self):
        if not settings.aws_s3_bucket:
            raise RuntimeError("S3 is not configured. Set AWS_S3_BUCKET.")
        self._bucket = settings.aws_s3_bucket
        local_credentials = bool(settings.aws_s3_endpoint_url)
        access_key = settings.aws_access_key_id or (
            "test" if local_credentials else None
        )
        secret_key = settings.aws_secret_access_key or (
            "test" if local_credentials else None
        )
        self._client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            endpoint_url=settings.aws_s3_endpoint_url or None,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            aws_session_token=settings.aws_session_token or None,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def ensure_bucket(self) -> None:
        if not settings.aws_s3_endpoint_url:
            return
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            params: dict[str, object] = {"Bucket": self._bucket}
            if settings.aws_region != "us-east-1":
                params["CreateBucketConfiguration"] = {
                    "LocationConstraint": settings.aws_region
                }
            self._client.create_bucket(**params)

    def upload(self, content: bytes, key: str, content_type: str) -> None:
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
        )

    def get(self, key: str) -> tuple[bytes, str]:
        try:
            obj = self._client.get_object(Bucket=self._bucket, Key=key)
        except ClientError as exc:
            raise FileNotFoundError(key) from exc
        body = obj["Body"].read()
        content_type = obj.get("ContentType") or "application/octet-stream"
        return body, content_type

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)


def ensure_s3_bucket() -> None:
    if not settings.aws_s3_bucket or not settings.aws_s3_endpoint_url:
        return
    S3FileStorage().ensure_bucket()
