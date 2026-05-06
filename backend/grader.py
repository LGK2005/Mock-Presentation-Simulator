"""
LLM Grading Module
==================
Sends the transcript, slide content, and persona to an LLM (GPT-4o)
and returns a structured grading JSON object.

Uses OpenAI's JSON mode for reliable structured output.
"""

import os
import json
from openai import OpenAI

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

# Initialize client (reused across invocations for connection pooling)
client = None


def _get_client():
    """Lazy-init the OpenAI client."""
    global client
    if client is None:
        if not OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY environment variable not set."
            )
        client = OpenAI(api_key=OPENAI_API_KEY)
    return client


# ─── Grading JSON Schema (for the LLM to follow) ────────────────
GRADING_JSON_SCHEMA = """{
  "overall_score": <float 0-10>,
  "max_score": 10.0,
  "verdict": "<EXCELLENT|GOOD|NEEDS_WORK|POOR>",
  "criteria": [
    {
      "name": "Content Accuracy",
      "score": <int 0-10>,
      "max_score": 10,
      "feedback": "<1-2 sentences>"
    },
    {
      "name": "Slide Coverage",
      "score": <int 0-10>,
      "max_score": 10,
      "feedback": "<1-2 sentences>"
    },
    {
      "name": "Clarity & Delivery",
      "score": <int 0-10>,
      "max_score": 10,
      "feedback": "<1-2 sentences>"
    },
    {
      "name": "Technical Depth",
      "score": <int 0-10>,
      "max_score": 10,
      "feedback": "<1-2 sentences>"
    }
  ],
  "persona_roast": "<1-2 sentence in-character feedback>",
  "key_missed_points": ["<point 1>", "<point 2>"],
  "filler_word_count": <int>,
  "words_per_minute": <int>,
  "speaking_time_seconds": <float>
}"""


def _build_system_prompt(persona, persona_prompt, language="vi"):
    """Build the system prompt for the LLM."""
    
    lang_instruction = "Vietnamese" if language == "vi" else "English"
    
    return f"""You are "{persona}". {persona_prompt}

You are grading a university student's mock presentation. They are presenting slide-by-slide and you must evaluate their verbal explanation of each slide.

IMPORTANT CONTEXT:
- The transcript was generated from audio and may contain recognition errors from accented "Vietglish" (Vietnamese-accented English). Use the SLIDE CONTENT as context to infer what the student likely said. Be lenient on exact wording but strict on whether the correct concepts were communicated.
- Count filler words: um, uh, like, you know, so, basically, right, actually, literally, I mean.
- Calculate words_per_minute from the transcript word count (estimate speaking time from word count / 130 WPM average if needed).

GRADING CRITERIA (0-10 each):
1. Content Accuracy — Did they correctly explain what's on the slide?
2. Slide Coverage — Did they address all key points on the slide?
3. Clarity & Delivery — Was the explanation clear and free of filler words?
4. Technical Depth — Did they go beyond surface-level reading of the slide?

VERDICT RULES:
- overall_score is the AVERAGE of the 4 criteria scores
- EXCELLENT: 8.0-10.0
- GOOD: 6.0-7.9
- NEEDS_WORK: 4.0-5.9
- POOR: 0.0-3.9

Stay fully in character for the persona_roast field. Be entertaining but fair.

CRITICAL: The student is presenting in {lang_instruction}. You MUST write ALL text fields (feedback, persona_roast, key_missed_points) entirely in {lang_instruction}.

You MUST respond with ONLY valid JSON matching this exact schema:
{GRADING_JSON_SCHEMA}"""


def _build_user_prompt(transcript, slide_text, slide_number, total_slides):
    """Build the user prompt with the actual content."""
    return f"""SLIDE {slide_number} of {total_slides}

=== SLIDE CONTENT (what's written on the slide) ===
{slide_text}

=== STUDENT'S VERBAL EXPLANATION (transcribed from audio) ===
{transcript}

Grade this explanation. Return ONLY valid JSON."""


def grade_slide_with_llm(transcript, slide_text, slide_number, total_slides, persona, persona_prompt, language="vi"):
    """
    Send transcript + slide content to the LLM for grading.

    Args:
        transcript: Transcribed student speech (from VALSEA ASR)
        slide_text: Extracted text from the PDF slide
        slide_number: Current slide number (1-indexed)
        total_slides: Total number of slides
        persona: Persona name (e.g., "Ruthless Tech Lead")
        persona_prompt: Persona description/behavior prompt

    Returns:
        dict: Grading result matching the schema above
    """
    llm_client = _get_client()

    system_prompt = _build_system_prompt(persona, persona_prompt, language)
    user_prompt = _build_user_prompt(transcript, slide_text, slide_number, total_slides)

    print(f"[LLM] Grading slide {slide_number} with persona '{persona}'...")

    response = llm_client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=1000,
    )

    raw_content = response.choices[0].message.content
    print(f"[LLM] Raw response: {raw_content[:300]}...")

    # Parse JSON
    try:
        grading = json.loads(raw_content)
    except json.JSONDecodeError as e:
        print(f"[LLM] JSON parse error: {e}")
        # Fallback: return a safe default
        grading = _fallback_grading(transcript, slide_number)

    # Validate and fix required fields
    grading = _validate_grading(grading)

    return grading


def _validate_grading(grading):
    """Ensure all required fields exist with correct types."""
    # Ensure criteria exists
    if "criteria" not in grading or not isinstance(grading["criteria"], list):
        grading["criteria"] = []

    # Ensure overall_score
    if "overall_score" not in grading:
        if grading["criteria"]:
            scores = [c.get("score", 5) for c in grading["criteria"]]
            grading["overall_score"] = round(sum(scores) / len(scores), 1)
        else:
            grading["overall_score"] = 5.0

    grading["max_score"] = 10.0

    # Ensure verdict matches score
    score = grading["overall_score"]
    if score >= 8:
        grading["verdict"] = "EXCELLENT"
    elif score >= 6:
        grading["verdict"] = "GOOD"
    elif score >= 4:
        grading["verdict"] = "NEEDS_WORK"
    else:
        grading["verdict"] = "POOR"

    # Ensure other fields
    grading.setdefault("persona_roast", "No comment.")
    grading.setdefault("key_missed_points", [])
    grading.setdefault("filler_word_count", 0)
    grading.setdefault("words_per_minute", 0)
    grading.setdefault("speaking_time_seconds", 0)

    return grading


def _fallback_grading(transcript, slide_number):
    """Generate a safe fallback if LLM response parsing fails."""
    word_count = len(transcript.split())
    return {
        "overall_score": 5.0,
        "max_score": 10.0,
        "verdict": "NEEDS_WORK",
        "criteria": [
            {"name": "Content Accuracy", "score": 5, "max_score": 10,
             "feedback": "Grading temporarily unavailable — please try again."},
            {"name": "Slide Coverage", "score": 5, "max_score": 10,
             "feedback": "Could not parse grading response."},
            {"name": "Clarity & Delivery", "score": 5, "max_score": 10,
             "feedback": f"You spoke approximately {word_count} words."},
            {"name": "Technical Depth", "score": 5, "max_score": 10,
             "feedback": "Re-record this slide for a full assessment."},
        ],
        "persona_roast": "I couldn't even grade this one. Try again.",
        "key_missed_points": [],
        "filler_word_count": 0,
        "words_per_minute": 0,
        "speaking_time_seconds": 0,
    }
