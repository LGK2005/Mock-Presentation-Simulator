"""
PDF Slide Extraction
====================
Extracts text from each slide of a PDF and renders pages as PNG images.

Uses PyMuPDF (fitz) for both text extraction and image rendering.
Rendered PNGs are uploaded to S3 under the 'slides/' prefix.

IMPORTANT: PyMuPDF must be available as a Lambda Layer.
  - Use a pre-built layer (e.g., keithrozario/Klayers) or build one with Docker.
"""

import io
import fitz  # PyMuPDF
from s3_utils import put_object_bytes, generate_presigned_get_url


def extract_slide_text(pdf_bytes, slide_number):
    """
    Extract text content from a specific slide (1-indexed).

    Args:
        pdf_bytes: Raw PDF bytes
        slide_number: 1-based slide index

    Returns:
        str: Extracted text from the slide
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    # Convert to 0-indexed
    page_index = slide_number - 1

    if page_index < 0 or page_index >= len(doc):
        doc.close()
        return f"(Slide {slide_number} not found — PDF has {len(doc)} pages)"

    page = doc[page_index]
    text = page.get_text("text").strip()
    doc.close()

    if not text:
        return f"(No text extracted from slide {slide_number} — may be image-only)"

    return text


def render_slides_to_images(pdf_bytes, s3_bucket):
    """
    Render each PDF page as a PNG image, upload to S3, and return metadata.

    Args:
        pdf_bytes: Raw PDF bytes
        s3_bucket: S3 bucket name for image uploads

    Returns:
        list[dict]: Per-slide metadata with image URLs and extracted text
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    slides = []

    for page_index in range(len(doc)):
        page = doc[page_index]
        slide_number = page_index + 1

        # Extract text
        text = page.get_text("text").strip()
        if not text:
            text = f"(No text on slide {slide_number})"

        # Render page to PNG (2x resolution for clarity)
        mat = fitz.Matrix(2.0, 2.0)  # 2x zoom
        pix = page.get_pixmap(matrix=mat)
        png_bytes = pix.tobytes("png")

        # Upload PNG to S3
        image_key = f"slides/slide_{slide_number}.png"
        put_object_bytes(
            bucket=s3_bucket,
            key=image_key,
            data=png_bytes,
            content_type="image/png",
        )

        # Generate presigned URL for frontend
        image_url = generate_presigned_get_url(s3_bucket, image_key, expiration=3600)

        slides.append({
            "slide_number": slide_number,
            "image_url": image_url,
            "extracted_text": text,
        })

        print(f"[PDF] Slide {slide_number}: {len(text)} chars, {len(png_bytes)} bytes PNG")

    doc.close()
    return slides
