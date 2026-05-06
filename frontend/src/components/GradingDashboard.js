"use client";

import styles from "./GradingDashboard.module.css";
import GradingCard from "./GradingCard";
import { translations } from "../lib/translations";

export default function GradingDashboard({
  totalSlides,
  gradingResults,
  loadingSlide,
  persona,
  isFinished = false,
  appLanguage = "vi",
}) {
  const t = translations[appLanguage] || translations["vi"];

  // Calculate summary stats
  const completedResults = Object.values(gradingResults).filter(Boolean);
  const avgScore =
    completedResults.length > 0
      ? completedResults.reduce(
          (sum, r) => sum + (r.grading?.overall_score || 0),
          0
        ) / completedResults.length
      : 0;
  const totalFillers = completedResults.reduce(
    (sum, r) => sum + (r.grading?.filler_word_count || 0),
    0
  );

  const getOverallVerdict = (score) => {
    if (score >= 8) return { label: t.verdictExcellent, emoji: "🌟", color: "#00b894" };
    if (score >= 6) return { label: t.verdictGood, emoji: "👍", color: "#0984e3" };
    if (score >= 4) return { label: t.verdictNeedsWork, emoji: "📝", color: "#fdcb6e" };
    return { label: t.verdictPoor, emoji: "😬", color: "#e17055" };
  };

  const verdict = getOverallVerdict(avgScore);

  // Aggregated Review Data
  const allMissedPoints = completedResults
    .flatMap(r => r.grading?.key_missed_points || [])
    .filter(Boolean);
  const uniqueMissedPoints = [...new Set(allMissedPoints)];

  const criteriaScores = {
    "Content Accuracy": 0,
    "Slide Coverage": 0,
    "Clarity & Delivery": 0,
    "Technical Depth": 0,
  };
  let validCount = 0;
  completedResults.forEach(r => {
    if (r.grading?.detailed_criteria) {
      validCount++;
      criteriaScores["Content Accuracy"] += r.grading.detailed_criteria.content_accuracy || 0;
      criteriaScores["Slide Coverage"] += r.grading.detailed_criteria.slide_coverage || 0;
      criteriaScores["Clarity & Delivery"] += r.grading.detailed_criteria.clarity_and_delivery || 0;
      criteriaScores["Technical Depth"] += r.grading.detailed_criteria.technical_depth || 0;
    }
  });

  const criteriaMap = {
    "Content Accuracy": t.critContentAccuracy,
    "Slide Coverage": t.critSlideCoverage,
    "Clarity & Delivery": t.critClarityDelivery,
    "Technical Depth": t.critTechnicalDepth
  };

  const strongestAreaName = Object.keys(criteriaScores).reduce((a, b) =>
    criteriaScores[a] > criteriaScores[b] ? a : b
  );
  const weakestAreaName = Object.keys(criteriaScores).reduce((a, b) =>
    criteriaScores[a] < criteriaScores[b] ? a : b
  );

  const avgCriteria = Object.entries(criteriaScores).map(([name, sum]) => ({
    name,
    score: validCount > 0 ? sum / validCount : 0
  })).sort((a, b) => a.score - b.score);

  const weakestAreaNameFallback = avgCriteria[0]?.name || "N/A";
  const strongestAreaNameFallback = avgCriteria[avgCriteria.length - 1]?.name || "N/A";
  
  const strongestArea = criteriaMap[strongestAreaName] || criteriaMap[strongestAreaNameFallback] || "N/A";
  const weakestArea = criteriaMap[weakestAreaName] || criteriaMap[weakestAreaNameFallback] || "N/A";
  const numSlidesPresented = completedResults.length;

  return (
    <div className={styles.container} id="grading-dashboard">
      {/* Summary header */}
      <div className={styles.summary}>
        <div className={styles.summaryLeft}>
          <h2 className={styles.summaryTitle}>
            {isFinished
              ? t.presentationComplete
              : t.liveGradingDashboard}
          </h2>
          <p className={styles.summarySubtitle}>
            {numSlidesPresented}/{totalSlides} {t.slidesGraded} • {persona.emoji}{" "}
            {persona.name}
          </p>
        </div>

        {completedResults.length > 0 && (
          <div className={styles.summaryStats}>
            <div className={styles.summaryCard} style={{ "--stat-color": verdict.color }}>
              <span className={styles.summaryEmoji}>{verdict.emoji}</span>
              <div>
                <p className={styles.summaryStatLabel}>{t.averageScore}</p>
                <p className={styles.summaryStatValue}>{avgScore.toFixed(1)}/10</p>
              </div>
            </div>
            <div
              className={styles.summaryCard}
              style={{ "--stat-color": totalFillers > 20 ? "#e17055" : "#00b894" }}
            >
              <span className={styles.summaryEmoji}>
                {totalFillers > 20 ? "😬" : "✨"}
              </span>
              <div>
                <p className={styles.summaryStatLabel}>{t.totalFillers}</p>
                <p className={styles.summaryStatValue}>{totalFillers}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={isFinished ? styles.finishedLayout : styles.grid}>
        {/* Cards grid / list */}
        {isFinished ? (
          <div className={styles.cardList}>
            {Array.from({ length: totalSlides }, (_, i) => {
              // Hide unpresented slides in finished mode
              if (!gradingResults[i] && loadingSlide !== i) return null;
              return (
                <GradingCard
                  key={i}
                  slideNumber={i + 1}
                  grading={gradingResults[i] || null}
                  isLoading={loadingSlide === i}
                  appLanguage={appLanguage}
                />
              );
            })}
          </div>
        ) : (
          <>
            {Array.from({ length: totalSlides }, (_, i) => (
              <GradingCard
                key={i}
                slideNumber={i + 1}
                grading={gradingResults[i] || null}
                isLoading={loadingSlide === i}
                appLanguage={appLanguage}
              />
            ))}
          </>
        )}

        {/* Overall Review Panel */}
        {isFinished && completedResults.length > 0 && (
          <div className={styles.overallReviewPanel}>
            <h3 className={styles.panelTitle}>{t.overallPerformance}</h3>
            
            <div className={styles.panelSection}>
              <h4>{t.finalVerdict}</h4>
              <p className={styles.verdictText} style={{ color: verdict.color }}>
                {verdict.emoji} {verdict.label}
              </p>
            </div>

            <div className={styles.panelSection}>
              <h4>{t.keyStrengths}</h4>
              <div className={styles.strengthCard}>
                <span className={styles.strengthIcon}>✅</span>
                <div>
                  <strong>{t.bestArea}</strong><br/>{strongestArea}
                </div>
              </div>
              <div className={styles.weaknessCard}>
                <span className={styles.weaknessIcon}>⚠️</span>
                <div>
                  <strong>{t.needsImprovement}</strong><br/>{weakestArea}
                </div>
              </div>
            </div>

            {uniqueMissedPoints.length > 0 && (
              <div className={styles.panelSection}>
                <h4>{t.criticalMissedPoints}</h4>
                <ul className={styles.missedList}>
                  {uniqueMissedPoints.map((point, idx) => (
                    <li key={idx}>❌ {point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
