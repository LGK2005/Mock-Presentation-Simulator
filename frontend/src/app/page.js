"use client";

import { useState, useCallback, useEffect } from "react";
import styles from "./page.module.css";
import UploadZone from "../components/UploadZone";
import PersonaSelector from "../components/PersonaSelector";
import SlideViewer from "../components/SlideViewer";
import GradingDashboard from "../components/GradingDashboard";
import { uploadToS3 } from "../lib/s3Upload";
import { extractSlides } from "../lib/api";
import { translations } from "../lib/translations";

/**
 * App Phases:
 * 1. UPLOAD    – User uploads PDF
 * 2. PERSONA   – User picks AI persona
 * 3. PRESENT   – Slide-by-slide recording + grading
 * 4. RESULTS   – Full dashboard view
 */

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [phase, setPhase] = useState("UPLOAD");
  const [isUploading, setIsUploading] = useState(false);
  const [slides, setSlides] = useState([]);
  const [persona, setPersona] = useState(null);
  const [gradingResults, setGradingResults] = useState({});
  const [loadingSlide, setLoadingSlide] = useState(null);
  const [error, setError] = useState(null);
  const [appLanguage, setAppLanguage] = useState("vi");
  const [presentationLanguage, setPresentationLanguage] = useState("vi");

  useEffect(() => {
    const savedPassword = localStorage.getItem("app_password");
    if (savedPassword) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput.trim()) {
      localStorage.setItem("app_password", passwordInput.trim());
      setIsAuthenticated(true);
    }
  };

  const t = translations[appLanguage] || translations["vi"];

  // Phase 1: Handle PDF upload
  const handleUpload = useCallback(async (file, setProgress) => {
    setIsUploading(true);
    setError(null);

    try {
      // Upload PDF to S3
      await uploadToS3(file, "pdf", setProgress);

      // Extract slides from the uploaded PDF
      const data = await extractSlides();
      setSlides(data.slides);

      // Move to persona selection
      setPhase("PERSONA");
    } catch (err) {
      console.error("Upload error:", err);
      setError(`Upload failed: ${err.message}. Please try again.`);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Phase 2: Handle persona selection
  const handlePersonaSelect = useCallback((selectedPersona) => {
    setPersona(selectedPersona);
  }, []);

  const startPresentation = useCallback(() => {
    if (!persona) return;
    setGradingResults({});
    setPhase("PRESENT");
  }, [persona]);

  // Phase 3: Handle grading result for a slide
  const handleGradingResult = useCallback((slideIndex, result) => {
    setGradingResults((prev) => ({
      ...prev,
      [slideIndex]: result,
    }));
    setLoadingSlide(null);
  }, []);

  // Phase 4: Presentation finished
  const handlePresentationComplete = useCallback(() => {
    setPhase("RESULTS");
  }, []);

  // Reset to start over
  const handleReset = useCallback(() => {
    setPhase("UPLOAD");
    setSlides([]);
    setPersona(null);
    setGradingResults({});
    setLoadingSlide(null);
    setError(null);
  }, []);

  if (!isAuthenticated) {
    return (
      <main className={styles.loginContainer}>
        <div className={styles.loginBackground} />
        <div className={styles.loginCard}>
          <span className={styles.loginIcon}>🔒</span>
          <h1 className={styles.loginTitle}>{t.loginTitle}</h1>
          <p className={styles.loginSubtitle}>
            {t.loginSubtitle}
          </p>
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <input 
              type="password" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              placeholder={t.loginPlaceholder}
              className={styles.loginInput}
            />
            <button type="submit" className={`btn btn-primary ${styles.loginButton}`}>
              {t.loginButton}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      {/* Navigation header */}
      <header className={styles.header}>
        <div className={styles.logo} onClick={handleReset} style={{ cursor: "pointer" }}>
          <div>
            <h1 className={styles.logoTitle}>{t.appTitle}</h1>
            <p className={styles.logoTag}>{t.appSubtitle}</p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "16px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{t.appLanguageSelect}:</span>
            <select
              value={appLanguage}
              onChange={(e) => setAppLanguage(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "4px",
                padding: "4px 8px",
                fontFamily: "var(--font-inter)",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="en" style={{background: "#1e1e2d"}}>English</option>
              <option value="vi" style={{background: "#1e1e2d"}}>Tiếng Việt</option>
            </select>
          </div>
          {/* Phase indicator */}
          <div className={styles.phases}>
            {["UPLOAD", "PERSONA", "PRESENT", "RESULTS"].map((p, i) => (
              <div
                key={p}
                className={`${styles.phaseStep} ${
                  phase === p ? styles.phaseActive : ""
                } ${
                  ["UPLOAD", "PERSONA", "PRESENT", "RESULTS"].indexOf(phase) > i
                    ? styles.phaseDone
                    : ""
                }`}
              >
                <span className={styles.phaseDot}>
                  {["UPLOAD", "PERSONA", "PRESENT", "RESULTS"].indexOf(phase) > i
                    ? "✓"
                    : i + 1}
                </span>
                <span className={styles.phaseLabel}>
                  {p === "UPLOAD"
                    ? t.phaseUpload
                    : p === "PERSONA"
                    ? t.phasePersona
                    : p === "PRESENT"
                    ? t.phasePresent
                    : t.phaseResults}
                </span>
              </div>
            ))}
          </div>

          {phase !== "UPLOAD" && (
            <button className="btn btn-secondary" onClick={handleReset} id="btn-reset">
              {t.startOver}
            </button>
          )}
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className={styles.errorClose}>
            ✕
          </button>
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {/* ═══ PHASE 1: Upload ═══ */}
        {phase === "UPLOAD" && (
          <div className={styles.phaseContent}>
            <div className={styles.hero}>
              <h2 className={styles.heroTitle}>
                {t.heroTitlePart1}
                <span className={styles.gradient}>{t.heroTitleGradient}</span>
              </h2>
              <p className={styles.heroSubtitle}>
                {t.uploadSubtitle}
              </p>
            </div>
            <UploadZone onUploadComplete={handleUpload} isUploading={isUploading} language={appLanguage} />
          </div>
        )}

        {/* ═══ PHASE 2: Persona Selection ═══ */}
        {phase === "PERSONA" && (
          <div className={styles.phaseContent}>
            <PersonaSelector
              selectedPersona={persona}
              onSelect={handlePersonaSelect}
              language={appLanguage}
            />
            {persona && (
              <div className={styles.startSection}>
                <div className={styles.readyCard}>
                  <p className={styles.readyText}>
                    <span style={{ fontSize: "1.5rem" }}>{persona.emoji}</span>{" "}
                    <strong>{persona.name}</strong> {t.isReadyToJudge} {" "}
                    {slides.length} {t.slidesText}.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", justifyContent: "center" }}>
                    <span style={{ fontSize: "1rem" }}>{t.presentationLanguage}:</span>
                    <select
                      value={presentationLanguage}
                      onChange={(e) => setPresentationLanguage(e.target.value)}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        fontFamily: "var(--font-inter)",
                        outline: "none",
                        cursor: "pointer",
                        fontSize: "1rem"
                      }}
                    >
                      <option value="en" style={{background: "#1e1e2d"}}>English</option>
                      <option value="vi" style={{background: "#1e1e2d"}}>Tiếng Việt</option>
                    </select>
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={startPresentation}
                    id="btn-start-presentation"
                    style={{ fontSize: "1.1rem", padding: "16px 40px" }}
                  >
                    🚀 {t.startPresentation}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ PHASE 3: Presentation ═══ */}
        {phase === "PRESENT" && (
          <div className={styles.presentLayout}>
            <div className={styles.viewerPane}>
              <SlideViewer
                slides={slides}
                persona={persona}
                onGradingResult={handleGradingResult}
                onPresentationComplete={handlePresentationComplete}
                appLanguage={appLanguage}
                presentationLanguage={presentationLanguage}
              />
            </div>
            <div className={styles.dashboardPane}>
              <GradingDashboard
                totalSlides={slides.length}
                gradingResults={gradingResults}
                loadingSlide={loadingSlide}
                persona={persona}
                isFinished={false}
                appLanguage={appLanguage}
              />
            </div>
          </div>
        )}

        {/* ═══ PHASE 4: Final Results ═══ */}
        {phase === "RESULTS" && (
          <div className={styles.phaseContent}>
            <GradingDashboard
              totalSlides={slides.length}
              gradingResults={gradingResults}
              loadingSlide={null}
              persona={persona}
              isFinished={true}
              appLanguage={appLanguage}
            />
            <div className={styles.resultActions}>
              <button
                className="btn btn-primary"
                onClick={handleReset}
                id="btn-new-presentation"
              >
                🔄 New Presentation
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const dataStr = JSON.stringify(gradingResults, null, 2);
                  const blob = new Blob([dataStr], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "grading-results.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                id="btn-export-results"
              >
                📥 Export Results (JSON)
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
