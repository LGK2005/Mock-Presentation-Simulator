"""
VALSEA ASR Integration
======================
Transcribes audio using the VALSEA Speech-to-Text API.

API Docs: https://valsea.ai/docs/api/transcribe
Endpoint: POST https://api.valsea.ai/v1/audio/transcriptions
Auth:     Bearer token via VALSEA_API_KEY env var

The API is OpenAI SDK compatible — uses multipart form upload.
"""

import os
import requests

VALSEA_API_URL = "https://api.valsea.ai/v1/audio/transcriptions"
VALSEA_API_KEY = os.environ.get("VALSEA_API_KEY", "")


def transcribe_audio(audio_bytes, language="vietnamese"):
    """
    Send audio bytes to VALSEA ASR and return the transcript text.

    Args:
        audio_bytes: Raw WAV audio bytes
        language: Language code (default 'english').
                  For Vietglish, 'english' works best since the student
                  is presenting in English with Vietnamese accent.
                  Use 'vietnamese' if the content is primarily Vietnamese.

    Returns:
        str: Transcribed text

    Raises:
        Exception: If VALSEA API returns an error
    """
    if not VALSEA_API_KEY:
        raise ValueError(
            "VALSEA_API_KEY environment variable not set. "
            "Get your key at https://valsea.ai/dashboard"
        )

    headers = {
        "Authorization": f"Bearer {VALSEA_API_KEY}",
    }

    # Multipart form data — OpenAI-compatible format
    files = {
        "file": ("audio.wav", audio_bytes, "audio/wav"),
    }

    data = {
        "model": "valsea-transcribe",
        "language": language,
        "response_format": "json",
    }

    print(f"[VALSEA] Sending {len(audio_bytes)} bytes to ASR (lang={language})...")

    response = requests.post(
        VALSEA_API_URL,
        headers=headers,
        files=files,
        data=data,
        timeout=30,  # 30 second timeout
    )

    if response.status_code == 401:
        raise Exception("VALSEA API key is invalid. Check your VALSEA_API_KEY.")
    elif response.status_code == 402:
        raise Exception("VALSEA credits exhausted. Top up at https://valsea.ai/dashboard.")
    elif response.status_code != 200:
        raise Exception(
            f"VALSEA ASR error {response.status_code}: {response.text}"
        )

    result = response.json()
    transcript = result.get("text", "")

    if not transcript:
        print("[VALSEA] Warning: Empty transcript returned")
        transcript = "(No speech detected)"

    print(f"[VALSEA] Transcript ({len(transcript)} chars): {transcript[:200]}")
    return transcript
