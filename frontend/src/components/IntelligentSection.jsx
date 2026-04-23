import React from "react";

import FeatureCard from "./FeatureCard.jsx";
import SectionHeader from "./SectionHeader.jsx";

export default function IntelligentSection({ features }) {
  return (
    <section className="section section--intelligent" id="insights">
      <div className="container">
        <SectionHeader eyebrow="Platform Tools" title="Inventory Features" subtitle="Tools for browsing, listing, and managing stock" />
        <div className="feature-grid">
          {features.map((feature) => (
            <FeatureCard {...feature} key={feature.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
