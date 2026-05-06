"""
Mock Presentation Simulator — Lambda Orchestrator
===================================================
Single Lambda function handling all 3 API Gateway routes:
  POST /upload-url     → Returns presigned S3 PUT URL
  POST /extract-slides → Extracts text + images from PDF, returns slide data
  POST /grade-slide    → Transcribes audio (VALSEA ASR) + grades with LLM

Environment Variables (set in Lambda Configuration):
  S3_BUCKET        — e.g. "mock-pres-bucket"
  VALSEA_API_KEY   — from https://valsea.ai/dashboard
  OPENAI_API_KEY   — for LLM grading (GPT-4o)
"""

import json
import os
import traceback

from s3_utils import generate_presigned_url, get_object_bytes, put_object_bytes
from transcribe import transcribe_audio
from pdf_extract import extract_slide_text, render_slides_to_images
from grader import grade_slide_with_llm


# ─── Configuration ───────────────────────────────────────────────
API_KEY = os.environ.get("API_KEY")
S3_BUCKET = os.environ.get("S3_BUCKET", "mock-pres-bucket")
PDF_KEY = "current_presentation.pdf"


def lambda_handler(event, context):
    """
    Main router. API Gateway sends the resource path in the event.
    """
    try:
        method = event.get("httpMethod", "POST")
        
        # Handle CORS preflight
        if method == "OPTIONS":
            return build_response(200, {"status": "ok"})

        # API Key Validation (if configured)
        if API_KEY:
            headers = event.get("headers", {}) or {}
            request_api_key = headers.get("x-api-key") or headers.get("X-Api-Key")
            if request_api_key != API_KEY:
                return build_response(401, {"status": "error", "message": "Unauthorized: Invalid API Key"})

        # Parse route from API Gateway
        path = event.get("resource", event.get("path", ""))
        body = json.loads(event.get("body", "{}") or "{}")

        # Route to handler
        if path == "/verify":
            response_body = {"status": "ok", "message": "Authenticated"}
        elif path == "/upload-url":
            response_body = handle_upload_url(body)
        elif path == "/extract-slides":
            response_body = handle_extract_slides(body)
        elif path == "/grade-slide":
            response_body = handle_grade_slide(body)
        else:
            response_body = {"status": "error", "message": f"Unknown route: {path}"}

        return build_response(200, response_body)

    except Exception as e:
        traceback.print_exc()
        return build_response(500, {
            "status": "error",
            "error_code": "INTERNAL_ERROR",
            "message": str(e),
        })


# ═══════════════════════════════════════════════════════════════════
# Route Handlers
# ═══════════════════════════════════════════════════════════════════

def handle_upload_url(body):
    """
    Returns a presigned S3 PUT URL for the frontend to upload
    either the PDF or the audio WAV directly.
    """
    file_type = body.get("file_type", "pdf")
    content_type = body.get("content_type", "application/pdf")

    if file_type == "pdf":
        key = PDF_KEY
    elif file_type == "wav":
        import uuid
        key = f"audio_{uuid.uuid4().hex[:8]}.wav"
    else:
        return {"status": "error", "message": f"Invalid file_type: {file_type}"}

    upload_url = generate_presigned_url(
        bucket=S3_BUCKET,
        key=key,
        content_type=content_type,
        expiration=300,  # 5 minutes
    )

    return {
        "upload_url": upload_url,
        "key": key,
    }


def handle_extract_slides(body):
    """
    Downloads the PDF from S3, extracts text per slide,
    renders each page as a PNG image, uploads images to S3,
    and returns slide metadata.
    """
    # Download PDF from S3
    pdf_bytes = get_object_bytes(S3_BUCKET, PDF_KEY)

    # Render slides to PNG images and upload to S3
    slides_data = render_slides_to_images(pdf_bytes, S3_BUCKET)

    return {
        "total_slides": len(slides_data),
        "slides": slides_data,
    }


def handle_grade_slide(body):
    """
    The core pipeline:
      1. Download audio from S3
      2. Transcribe with VALSEA ASR
      3. Extract text from the specific slide
      4. Send transcript + slide text + persona to LLM
      5. Return grading JSON
    """
    slide_number = body.get("slide_number", 1)
    total_slides = body.get("total_slides", 1)
    persona = body.get("persona", "Strict Professor")
    persona_prompt = body.get("persona_prompt", "You are a strict professor.")
    audio_key = body.get("audio_key", "")
    language = body.get("language", "vi")

    if not audio_key:
        return {"status": "error", "message": "Missing audio_key"}

    # Step 1: Get audio from S3
    audio_bytes = get_object_bytes(S3_BUCKET, audio_key)
    print(f"[GRADE] Downloaded audio: {len(audio_bytes)} bytes")

    # Step 2: Transcribe with VALSEA ASR
    transcript = transcribe_audio(audio_bytes, language=language)
    print(f"[GRADE] Transcript: {transcript[:100]}...")

    # Step 3: Extract slide text from PDF
    pdf_bytes = get_object_bytes(S3_BUCKET, PDF_KEY)
    slide_text = extract_slide_text(pdf_bytes, slide_number)
    print(f"[GRADE] Slide {slide_number} text: {slide_text[:100]}...")

    # Step 4: Grade with LLM
    grading_result = grade_slide_with_llm(
        transcript=transcript,
        slide_text=slide_text,
        slide_number=slide_number,
        total_slides=total_slides,
        persona=persona,
        persona_prompt=persona_prompt,
        language=language,
    )

    return {
        "status": "success",
        "slide_number": slide_number,
        "transcript": transcript,
        "grading": grading_result,
    }


# ═══════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════

def build_response(status_code, body):
    """Build API Gateway response with CORS headers."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key, x-api-key",
        },
        "body": json.dumps(body),
    }
