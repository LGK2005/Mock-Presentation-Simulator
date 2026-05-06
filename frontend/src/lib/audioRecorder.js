/**
 * Audio recording utility using MediaRecorder API.
 * Records audio and converts to WAV format.
 */

/**
 * Creates an audio recorder instance.
 * @returns {Object} Recorder controller with start, stop, getBlob methods
 */
export function createAudioRecorder() {
  let mediaRecorder = null;
  let audioChunks = [];
  let stream = null;
  let startTime = null;

  return {
    /**
     * Start recording audio from the microphone.
     */
    async start() {
      audioChunks = [];
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaRecorder = new MediaRecorder(stream, {
        mimeType: getSupportedMimeType(),
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.start(250); // Collect data every 250ms
      startTime = Date.now();
    },

    /**
     * Stop recording and return the audio as a WAV Blob.
     * @returns {Promise<{blob: Blob, duration: number}>}
     */
    async stop() {
      return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
          resolve({ blob: new Blob(), duration: 0 });
          return;
        }

        const duration = (Date.now() - startTime) / 1000;

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, {
            type: mediaRecorder.mimeType,
          });

          // Convert to WAV for VALSEA ASR compatibility
          const wavBlob = await convertToWav(audioBlob);

          // Clean up
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }

          resolve({ blob: wavBlob, duration });
        };

        mediaRecorder.stop();
      });
    },

    /**
     * Check if currently recording.
     */
    isRecording() {
      return mediaRecorder && mediaRecorder.state === "recording";
    },

    /**
     * Get elapsed recording time in seconds.
     */
    getElapsedTime() {
      if (!startTime) return 0;
      return (Date.now() - startTime) / 1000;
    },
  };
}

/**
 * Get a supported audio MIME type for MediaRecorder.
 */
function getSupportedMimeType() {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/**
 * Convert an audio blob to WAV format using AudioContext.
 * @param {Blob} audioBlob
 * @returns {Promise<Blob>} WAV blob
 */
async function convertToWav(audioBlob) {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 16000,
  });

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const wavBuffer = encodeWav(audioBuffer);
    return new Blob([wavBuffer], { type: "audio/wav" });
  } catch (err) {
    console.warn("WAV conversion failed, sending original format:", err);
    return audioBlob;
  } finally {
    audioContext.close();
  }
}

/**
 * Encode an AudioBuffer to WAV format (PCM 16-bit, mono).
 */
function encodeWav(audioBuffer) {
  const numChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.getChannelData(0);
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * blockAlign;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(
      offset,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
    offset += 2;
  }

  return buffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
