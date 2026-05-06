/**
 * API client for the Mock Presentation Simulator backend.
 * All calls go through API Gateway → Lambda.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

async function request(endpoint, body = {}) {
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API error: ${res.status} ${res.statusText}`
    );
  }

  return res.json();
}

/**
 * Get a presigned S3 upload URL.
 * @param {"pdf"|"wav"} fileType
 * @returns {Promise<{upload_url: string, key: string}>}
 */
export async function getUploadUrl(fileType) {
  const contentType = fileType === "pdf" ? "application/pdf" : "audio/wav";
  return request("/upload-url", { file_type: fileType, content_type: contentType });
}

/**
 * Extract slides from the uploaded PDF.
 * @returns {Promise<{total_slides: number, slides: Array}>}
 */
export async function extractSlides() {
  return request("/extract-slides", { placeholder: true });
}

/**
 * Grade a single slide based on the recorded audio.
 * @param {number} slideNumber
 * @param {number} totalSlides
 * @param {string} personaName
 * @param {string} personaPrompt
 * @param {string} audioKey
 * @returns {Promise<Object>} Grading payload
 */
export async function gradeSlide(slideNumber, totalSlides, personaName, personaPrompt, audioKey, language = "vi") {
  const headers = { "Content-Type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  const response = await fetch(`${API_BASE}/grade-slide`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      slide_number: slideNumber,
      total_slides: totalSlides,
      persona: personaName,
      persona_prompt: personaPrompt,
      audio_key: audioKey,
      language: language,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API error: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
}
