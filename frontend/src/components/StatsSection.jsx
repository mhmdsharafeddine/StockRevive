import React from "react";

import MetricCard from "./MetricCard.jsx";

export default function StatsSection({ metrics }) {
  return (
    <section className="stats-section">
      <div className="container metrics-grid">
        {metrics.map((metric) => (
          <MetricCard {...metric} key={metric.label} />
        ))}
      </div>
    </section>
  );
}
