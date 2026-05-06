"""
S3 utility functions for presigned URLs, get/put operations.
"""

import boto3

s3_client = boto3.client("s3")


def generate_presigned_url(bucket, key, content_type, expiration=300):
    """
    Generate a presigned PUT URL so the frontend can upload directly to S3.

    Args:
        bucket: S3 bucket name
        key: S3 object key
        content_type: MIME type (e.g., 'application/pdf', 'audio/wav')
        expiration: URL validity in seconds (default 5 min)

    Returns:
        Presigned URL string
    """
    url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expiration,
    )
    return url


def get_object_bytes(bucket, key):
    """
    Download an object from S3 and return its bytes.

    Args:
        bucket: S3 bucket name
        key: S3 object key

    Returns:
        bytes content of the object
    """
    response = s3_client.get_object(Bucket=bucket, Key=key)
    return response["Body"].read()


def put_object_bytes(bucket, key, data, content_type="application/octet-stream"):
    """
    Upload bytes to S3.

    Args:
        bucket: S3 bucket name
        key: S3 object key
        data: bytes to upload
        content_type: MIME type
    """
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


def generate_presigned_get_url(bucket, key, expiration=3600):
    """
    Generate a presigned GET URL for reading an S3 object.

    Args:
        bucket: S3 bucket name
        key: S3 object key
        expiration: URL validity in seconds (default 1 hour)

    Returns:
        Presigned URL string
    """
    url = s3_client.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": bucket,
            "Key": key,
        },
        ExpiresIn=expiration,
    )
    return url
