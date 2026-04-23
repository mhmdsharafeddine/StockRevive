import React from "react";

export default function MetricCard({ label, value, badge }) {
  return (
    <article className="metric-card">
      <div className="metric-card__top">
        <h3>{label}</h3>
        <span>{badge}</span>
      </div>
      <strong>{value}</strong>
    </article>
  );
}
