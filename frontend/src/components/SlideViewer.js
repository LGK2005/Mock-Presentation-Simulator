"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./SlideViewer.module.css";
import { createAudioRecorder } from "../lib/audioRecorder";
import { uploadToS3 } from "../lib/s3Upload";
import { gradeSlide } from "../lib/api";
import { translations } from "../lib/translations";

export default function SlideViewer({
  slides,
  persona,
  onGradingResult,
  onPresentationComplete,
  appLanguage = "vi",
  presentationLanguage = "vi",
}) {
  const t = translations[appLanguage] || translations["vi"];
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [hasStarted, setHasStarted] = useState(false);

  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const totalSlides = slides.length;

  // Timer for recording duration
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      recorderRef.current = createAudioRecorder();
      await recorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setHasStarted(true);
    } catch (err) {
      alert(
        "Microphone access denied. Please allow microphone access and try again."
      );
      console.error("Mic error:", err);
    }
  }, []);

  const stopAndGrade = useCallback(async (finishEarly = false) => {
    if (!recorderRef.current) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      // Step 1: Stop recording
      setProcessingStatus(t.savingAudio);
      const { blob, duration } = await recorderRef.current.stop();

      if (duration < 2) {
        setProcessingStatus("");
        setIsProcessing(false);
        alert("Recording too short. Please speak for at least 2 seconds.");
        return;
      }

      // Step 2: Upload audio to S3
      setProcessingStatus(t.uploadingAudio);
      const audioKey = await uploadToS3(blob, "wav");

      // Step 3: Trigger grading
      setProcessingStatus(t.transcribing);
      const result = await gradeSlide(
        currentSlide + 1,
        totalSlides,
        persona.name,
        persona.prompt,
        audioKey,
        presentationLanguage
      );

      // Step 4: Send result to parent
      setProcessingStatus(t.gradingComplete);
      onGradingResult(currentSlide, result);

      // Brief delay to show completion
      await new Promise((r) => setTimeout(r, 500));

      // Step 5: Move to next slide or finish
      if (!finishEarly && currentSlide < totalSlides - 1) {
        setCurrentSlide((prev) => prev + 1);
        setIsProcessing(false);
        setProcessingStatus("");
      } else {
        onPresentationComplete();
      }
    } catch (err) {
      console.error("Grading error:", err);
      setProcessingStatus(`❌ Error: ${err.message}`);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStatus("");
      }, 3000);
    }
  }, [currentSlide, totalSlides, persona, onGradingResult, onPresentationComplete]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const slideData = slides[currentSlide];

  return (
    <div className={styles.container} id="slide-viewer">
      {/* Header bar */}
      <div className={styles.header}>
        <div className={styles.slideCounter}>
          <span className={styles.slideLabel}>Slide</span>
          <span className={styles.slideNum}>
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>

        <div className={styles.personaBadge}>
          <span>{persona.emoji}</span>
          <span>{persona.name}</span>
        </div>

        {/* Progress bar */}
        <div className={styles.progressWrap}>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${((currentSlide + (isRecording ? 0.5 : 0)) / totalSlides) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Slide display */}
      <div className={styles.slideArea}>
        <div className={styles.slideFrame}>
          {slideData?.image_url ? (
            <img
              src={slideData.image_url}
              alt={`Slide ${currentSlide + 1}`}
              className={styles.slideImage}
              id={`slide-image-${currentSlide + 1}`}
            />
          ) : (
            <div className={styles.slidePlaceholder}>
              <p>Slide {currentSlide + 1}</p>
              <p className={styles.slideText}>{slideData?.extracted_text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Gallery */}
      <div className={styles.thumbnailGallery}>
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`${styles.thumbnailCard} ${currentSlide === i ? styles.thumbnailActive : ""}`}
            onClick={() => {
              if (!isRecording && !isProcessing) {
                setCurrentSlide(i);
              }
            }}
          >
            {slide.image_url ? (
              <img src={slide.image_url} alt={`Slide ${i + 1}`} className={styles.thumbnailImage} />
            ) : (
              <div className={styles.thumbnailImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem' }}>
                Text
              </div>
            )}
            <span className={styles.thumbnailIndex}>Slide {i + 1}</span>
          </div>
        ))}
      </div>

      {/* Control bar */}
      <div className={styles.controls}>
        {isProcessing ? (
          <div className={styles.processingBar}>
            <div className="spinner" />
            <span className={styles.processingText}>{processingStatus}</span>
          </div>
        ) : (
          <>
            {!hasStarted ? (
              <div className={styles.actionButtons}>
                <button
                  className="btn btn-primary"
                  onClick={startRecording}
                  id="btn-start-recording"
                  style={{ fontSize: "1.1rem", padding: "16px 40px" }}
                >
                  {t.startPresenting}
                </button>
              </div>
            ) : isRecording ? (
              <div className={styles.recordingControls}>
                <div className={styles.recordingIndicator}>
                  <span className={styles.recordingDot} />
                  <span className={styles.recordingLabel}>{t.recording}</span>
                  <span className={styles.recordingTimer}>
                    {formatTime(recordingTime)}
                  </span>
                </div>

                <div className={styles.actionButtons}>
                  <button
                    className={`btn ${
                      currentSlide < totalSlides - 1
                        ? "btn-primary"
                        : "btn-success"
                    }`}
                    onClick={() => stopAndGrade(false)}
                    id="btn-next-slide"
                  >
                    {currentSlide < totalSlides - 1
                      ? t.nextSlide
                      : t.finishPresentation}
                  </button>
                  
                  {currentSlide < totalSlides - 1 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => stopAndGrade(true)}
                    >
                      {t.finishEarly}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.actionButtons}>
                <button
                  className="btn btn-primary"
                  onClick={startRecording}
                  id="btn-continue-recording"
                >
                  {t.startRecordingSlide}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={onPresentationComplete}
                >
                  {t.seeResultsNow}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
