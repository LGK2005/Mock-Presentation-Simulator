#!/bin/bash
# ═══════════════════════════════════════════════════════
# Lambda Deployment Script
# ═══════════════════════════════════════════════════════
#
# This script packages the Lambda function code + dependencies
# into a zip file and deploys it to AWS Lambda.
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Docker (for building PyMuPDF on Amazon Linux 2)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ═══════════════════════════════════════════════════════

set -e

FUNCTION_NAME="slideAndVoiceProcessing"
REGION="ap-southeast-1"
BUILD_DIR="build"
ZIP_FILE="lambda_package.zip"

echo "🧹 Cleaning previous build..."
rm -rf "$BUILD_DIR" "$ZIP_FILE"
mkdir -p "$BUILD_DIR"

echo "📦 Installing dependencies..."
# Use Docker to build for Lambda's Amazon Linux 2 environment
docker run --rm -v "$PWD":/var/task \
  -w /var/task \
  public.ecr.aws/sam/build-python3.12:latest \
  pip install -r requirements.txt -t "$BUILD_DIR/" --no-cache-dir

echo "📄 Copying Lambda source files..."
cp lambda_function.py "$BUILD_DIR/"
cp s3_utils.py "$BUILD_DIR/"
cp transcribe.py "$BUILD_DIR/"
cp pdf_extract.py "$BUILD_DIR/"
cp grader.py "$BUILD_DIR/"

echo "🗜️ Creating deployment package..."
cd "$BUILD_DIR"
zip -r "../$ZIP_FILE" . -x "*.pyc" "__pycache__/*" "*.dist-info/*"
cd ..

PACKAGE_SIZE=$(du -sh "$ZIP_FILE" | cut -f1)
echo "📊 Package size: $PACKAGE_SIZE"

echo "🚀 Deploying to Lambda..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://$ZIP_FILE" \
  --region "$REGION"

echo ""
echo "✅ Deployed successfully!"
echo ""
echo "🔧 Don't forget to set environment variables:"
echo "   aws lambda update-function-configuration \\"
echo "     --function-name $FUNCTION_NAME \\"
echo "     --region $REGION \\"
echo "     --timeout 60 \\"
echo "     --memory-size 512 \\"
echo "     --environment 'Variables={S3_BUCKET=mock-pres-bucket,VALSEA_API_KEY=your_key_here,OPENAI_API_KEY=your_key_here}'"
echo ""
echo "📝 Or set them in the AWS Console: Lambda > Configuration > Environment variables"
