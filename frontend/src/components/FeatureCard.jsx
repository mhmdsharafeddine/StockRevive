import React from "react";
import { ArrowRight } from "lucide-react";

export default function FeatureCard({ title, description, action, icon: Icon, tone = "blue" }) {
  return (
    <article className="feature-card">
      <div className={`feature-card__icon feature-card__icon--${tone}`}>
        <Icon size={38} strokeWidth={2.1} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <a href={`#${title.toLowerCase().replaceAll(" ", "-")}`}>
          {action}
          <ArrowRight size={18} strokeWidth={2.1} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}
