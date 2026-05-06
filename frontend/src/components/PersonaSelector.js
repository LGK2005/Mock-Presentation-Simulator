"use client";

import { useState } from "react";
import styles from "./PersonaSelector.module.css";
import { translations } from "../lib/translations";

const PRESET_PERSONAS = [
  {
    id: "ruthless-tech-lead",
    name: "Ruthless Tech Lead",
    emoji: "😈",
    prompt:
      "You are a ruthless Silicon Valley tech lead who has zero patience for vague explanations. You demand specifics, metrics, architecture diagrams in words, and crystal-clear logic. If the presenter hand-waves or uses buzzwords without substance, tear them apart. Be direct, sarcastic, but ultimately helpful.",
    color: "#e17055",
  },
  {
    id: "supportive-mentor",
    name: "Supportive Mentor",
    emoji: "🤗",
    prompt:
      "You are a warm, encouraging university mentor who believes in constructive feedback. Point out strengths first, then areas for improvement. Use positive language but still be honest about gaps. Suggest specific improvements rather than just criticism.",
    color: "#00b894",
  },
  {
    id: "sarcastic-professor",
    name: "Sarcastic Professor",
    emoji: "🎓",
    prompt:
      "You are a tenured professor who has seen 10,000 bad presentations and has developed a dry, sarcastic wit as a defense mechanism. Grade fairly but deliver feedback with wit and subtle roasts. Make the student laugh while learning.",
    color: "#6c5ce7",
  },
  {
    id: "vc-investor",
    name: "VC Investor",
    emoji: "💰",
    prompt:
      "You are a venture capitalist evaluating a startup pitch. You care about market size, traction, competitive advantage, and clear communication. If the presenter doesn't sell you in 60 seconds per slide, you're checking your phone. Grade on persuasiveness and business acumen.",
    color: "#ffc048",
  },
];

export default function PersonaSelector({ selectedPersona, onSelect, language = "vi" }) {
  const t = translations[language] || translations["vi"];
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleCustomSubmit = () => {
    if (!customName.trim() || !customPrompt.trim()) return;
    onSelect({
      id: "custom",
      name: customName,
      emoji: "🎭",
      prompt: customPrompt,
      color: "#fd79a8",
    });
  };

  return (
    <div className={styles.container} id="persona-selector">
      <div className={styles.header}>
        <h3 className={styles.title}>{t.choosePersona}</h3>
        <p className={styles.subtitle}>
          {t.selectPersonaSubtitle}
        </p>
      </div>

      <div className={styles.grid}>
        {PRESET_PERSONAS.map((persona) => (
          <button
            key={persona.id}
            id={`persona-${persona.id}`}
            className={`${styles.card} ${
              selectedPersona?.id === persona.id ? styles.selected : ""
            }`}
            onClick={() => {
              setCustomMode(false);
              onSelect(persona);
            }}
            style={{
              "--persona-color": persona.color,
              "--persona-glow": `${persona.color}33`,
            }}
          >
            <span className={styles.emoji}>{persona.emoji}</span>
            <span className={styles.name}>{persona.name}</span>
            <span className={styles.preview}>
              {persona.prompt.slice(0, 60)}...
            </span>
          </button>
        ))}
      </div>

      {/* Custom Persona */}
      <div className={styles.customSection}>
        <button
          className={`${styles.customToggle} ${customMode ? styles.customActive : ""}`}
          onClick={() => setCustomMode(!customMode)}
          id="custom-persona-toggle"
        >
          🎭 {t.createCustomPersona}
        </button>

        {customMode && (
          <div className={styles.customForm}>
            <input
              className="input"
              placeholder={t.customNamePlaceholder}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              id="custom-persona-name"
            />
            <textarea
              className="textarea"
              placeholder={t.customPromptPlaceholder}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              id="custom-persona-prompt"
            />
            <button
              className="btn btn-primary"
              onClick={handleCustomSubmit}
              disabled={!customName.trim() || !customPrompt.trim()}
              id="custom-persona-submit"
            >
              {t.useThisPersona}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
