"use client";

import { useState } from "react";
import styles from "./GradingCard.module.css";
import { translations } from "../lib/translations";

const VERDICT_MAP = {
  EXCELLENT: { label: "Excellent", class: "badge-excellent", color: "#00b894" },
  GOOD: { label: "Good", class: "badge-good", color: "#0984e3" },
  NEEDS_WORK: { label: "Needs Work", class: "badge-needs-work", color: "#fdcb6e" },
  POOR: { label: "Poor", class: "badge-poor", color: "#e17055" },
};

function ScoreRing({ score, maxScore, color }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const percent = score / maxScore;
  const dashOffset = circumference * (1 - percent);

  return (
    <div className="score-ring">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle className="score-ring-bg" cx="32" cy="32" r={radius} />
        <circle
          className="score-ring-fill"
          cx="32"
          cy="32"
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="score-ring-text" style={{ color }}>
        {score.toFixed(1)}
      </div>
    </div>
  );
}

export default function GradingCard({ slideNumber, grading, isLoading, appLanguage = "vi" }) {
  const [expanded, setExpanded] = useState(false);
  const t = translations[appLanguage] || translations["vi"];

  if (isLoading) {
    return (
      <div className={`${styles.card} ${styles.loading}`}>
        <div className={styles.cardHeader}>
          <span className={styles.slideNum}>Slide {slideNumber}</span>
          <div className="spinner" />
        </div>
        <p className={styles.loadingText}>{t.gradingSlide}...</p>
      </div>
    );
  }

  if (!grading) {
    return (
      <div className={`${styles.card} ${styles.pending}`}>
        <div className={styles.cardHeader}>
          <span className={styles.slideNum}>Slide {slideNumber}</span>
        </div>
        <p className={styles.pendingText}>{t.waitingToPresent}</p>
      </div>
    );
  }

  const verdict = VERDICT_MAP[grading.grading.verdict] || VERDICT_MAP.NEEDS_WORK;

  return (
    <div
      className={`${styles.card} ${styles.graded} ${expanded ? styles.expanded : ""}`}
      onClick={() => setExpanded(!expanded)}
      style={{ "--verdict-color": verdict.color }}
      id={`grading-card-${slideNumber}`}
    >
      {/* Compact view */}
      <div className={styles.cardHeader}>
        <span className={styles.slideNum}>Slide {slideNumber}</span>
        <span className={`badge ${verdict.class}`}>{verdict.label}</span>
      </div>

      <div className={styles.scoreRow}>
        <ScoreRing
          score={grading.grading.overall_score}
          maxScore={grading.grading.max_score}
          color={verdict.color}
        />
        <div className={styles.quickStats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t.fillers}</span>
            <span className={styles.statValue}>
              {grading.grading.filler_word_count}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{t.wpm}</span>
            <span className={styles.statValue}>
              {grading.grading.words_per_minute || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Persona roast */}
      <div className={styles.roast}>
        <p>&ldquo;{grading.grading.persona_roast}&rdquo;</p>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className={styles.details}>
          {/* Transcript */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>📝 Your Transcript</h4>
            <p className={styles.transcript}>{grading.transcript}</p>
          </div>

          {/* Criteria breakdown */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>📊 Criteria Breakdown</h4>
            <div className={styles.criteriaList}>
              {grading.grading.criteria?.map((criterion, i) => (
                <div key={i} className={styles.criterion}>
                  <div className={styles.criterionHeader}>
                    <span className={styles.criterionName}>{criterion.name}</span>
                    <span className={styles.criterionScore}>
                      {criterion.score}/{criterion.max_score}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${(criterion.score / criterion.max_score) * 100}%` }}
                    />
                  </div>
                  <p className={styles.criterionFeedback}>{criterion.feedback}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Missed points */}
          {grading.grading.key_missed_points?.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>⚠️ Key Missed Points</h4>
              <ul className={styles.missedList}>
                {grading.grading.key_missed_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          <p className={styles.expandHint}>Click to collapse</p>
        </div>
      )}

      {!expanded && (
        <p className={styles.expandHint}>Click for details</p>
      )}
    </div>
  );
}
