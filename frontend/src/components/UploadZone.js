"use client";

import { useState, useRef, useCallback } from "react";
import styles from "./UploadZone.module.css";

export default function UploadZone({ onUploadComplete, isUploading }) {
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef(null);

  const handleFile = useCallback(
    async (file) => {
      if (!file || file.type !== "application/pdf") {
        alert("Please upload a PDF file.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert("File too large. Max 20MB.");
        return;
      }
      setFileName(file.name);
      onUploadComplete(file, setProgress);
    },
    [onUploadComplete]
  );

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div
      id="upload-zone"
      className={`${styles.zone} ${dragActive ? styles.active : ""} ${
        isUploading ? styles.uploading : ""
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className={styles.input}
        id="pdf-upload-input"
      />

      <div className={styles.content}>
        {isUploading ? (
          <>
            <div className={styles.iconUploading}>⏳</div>
            <p className={styles.title}>Uploading {fileName}...</p>
            <div className="progress-bar" style={{ maxWidth: 300 }}>
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={styles.subtitle}>{progress}% complete</p>
          </>
        ) : (
          <>
            <div className={styles.icon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="12" y2="12" />
                <line x1="15" y1="15" x2="12" y2="12" />
              </svg>
            </div>
            <p className={styles.title}>
              {fileName ? `✅ ${fileName}` : "Drop your presentation PDF here"}
            </p>
            <p className={styles.subtitle}>
              or click to browse • PDF only • Max 20MB
            </p>
          </>
        )}
      </div>

      {/* Animated border */}
      <div className={styles.borderGlow} />
    </div>
  );
}
