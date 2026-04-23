import React from "react";

export default function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="section-header">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}
