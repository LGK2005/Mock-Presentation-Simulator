/**
 * S3 upload helper using presigned URLs.
 */

import { getUploadUrl } from "./api";

/**
 * Upload a file to S3 using a presigned PUT URL.
 * @param {File|Blob} file - The file to upload
 * @param {"pdf"|"wav"} fileType - Type of file
 * @param {function} [onProgress] - Optional progress callback (0-100)
 * @returns {Promise<string>} The S3 key of the uploaded file
 */
export async function uploadToS3(file, fileType, onProgress) {
  // Step 1: Get presigned URL from our backend
  const { upload_url, key } = await getUploadUrl(fileType);

  // Step 2: Upload directly to S3
  const contentType = fileType === "pdf" ? "application/pdf" : "audio/wav";

  if (onProgress) {
    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", upload_url, true);
      xhr.setRequestHeader("Content-Type", contentType);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(key);
        } else {
          reject(new Error(`S3 upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("S3 upload network error"));
      xhr.send(file);
    });
  }

  // Simple fetch upload (no progress)
  const res = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`S3 upload failed: ${res.status}`);
  }

  return key;
}
