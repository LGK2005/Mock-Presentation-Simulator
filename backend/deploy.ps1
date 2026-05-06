$FunctionName = "slideAndVoiceProcessing"
$Region = "ap-southeast-1"
$BuildDir = "build"
$ZipFile = "lambda_package.zip"

Write-Host "Cleaning previous build..."
if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
if (Test-Path $ZipFile) { Remove-Item -Force $ZipFile }
New-Item -ItemType Directory -Path $BuildDir | Out-Null

Write-Host "Installing dependencies for AWS Lambda (Linux x86_64)..."
# We use pip to directly download the Linux binaries instead of using Docker
pip install --platform manylinux2014_x86_64 --target="$BuildDir" --implementation cp --python-version 3.12 --only-binary=:all: --upgrade -r requirements.txt

Write-Host "Copying Lambda source files..."
Copy-Item lambda_function.py -Destination "$BuildDir\"
Copy-Item s3_utils.py -Destination "$BuildDir\"
Copy-Item transcribe.py -Destination "$BuildDir\"
Copy-Item pdf_extract.py -Destination "$BuildDir\"
Copy-Item grader.py -Destination "$BuildDir\"

Write-Host "Creating deployment package..."
Compress-Archive -Path "$BuildDir\*" -DestinationPath $ZipFile -Force

Write-Host "Deploying to Lambda..."
aws lambda update-function-code --function-name $FunctionName --zip-file "fileb://$ZipFile" --region $Region | Out-Null

Write-Host ""
Write-Host "Deployed successfully!"
