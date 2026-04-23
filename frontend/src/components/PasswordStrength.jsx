import React from "react";

export function getPasswordStrength(password) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (!password) {
    return { score: 0, label: "Password strength", tone: "empty" };
  }

  if (score <= 2) {
    return { score, label: "Weak password", tone: "weak" };
  }

  if (score <= 4) {
    return { score, label: "Good password", tone: "good" };
  }

  return { score, label: "Strong password", tone: "strong" };
}

export default function PasswordStrength({ password }) {
  const strength = getPasswordStrength(password);
  const width = `${Math.max(strength.score, password ? 1 : 0) * 20}%`;

  return (
    <div className={`password-strength password-strength--${strength.tone}`}>
      <div className="password-strength__top">
        <span>{strength.label}</span>
        <span>{strength.score}/5</span>
      </div>
      <div className="password-strength__track">
        <div style={{ width }} />
      </div>
      <p>Use at least 8 characters with uppercase, lowercase, number, and symbol.</p>
    </div>
  );
}
