/**
 * API client for the Mock Presentation Simulator backend.
 * All calls go through API Gateway → Lambda.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function request(endpoint, body = {}) {
  const headers = { "Content-Type": "application/json" };
  
  // Read password from localStorage
  let apiKey = "";
  if (typeof window !== "undefined") {
    apiKey = localStorage.getItem("app_password") || "";
  }
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("app_password");
        window.location.reload(); // Force reload to show login screen
      }
      throw new Error("Unauthorized: Invalid Password");
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API error: ${res.status} ${res.statusText}`
    );
  }

  return res.json();
}

/**
 * Verify a password against the backend /verify endpoint.
 * Returns true if valid, false if not.
 */
export async function verifyPassword(password) {
  const res = await fetch(`${API_BASE}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": password,
    },
    body: JSON.stringify({}),
  });
  return res.ok;
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
  
  let apiKey = "";
  if (typeof window !== "undefined") {
    apiKey = localStorage.getItem("app_password") || "";
  }
  if (apiKey) headers["x-api-key"] = apiKey;

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
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("app_password");
        window.location.reload();
      }
      throw new Error("Unauthorized: Invalid Password");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API error: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
}
