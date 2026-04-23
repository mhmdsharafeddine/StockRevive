import React from "react";

import FeatureCard from "./FeatureCard.jsx";
import SectionHeader from "./SectionHeader.jsx";

export default function FeaturesSection({ features }) {
  return (
    <section className="section section--features" id="retail">
      <div className="container">
        <SectionHeader title="Platform Features" subtitle="Everything you need to make intelligent inventory decisions" />
        <div className="feature-grid feature-grid--large">
          {features.map((feature) => (
            <FeatureCard {...feature} key={feature.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
