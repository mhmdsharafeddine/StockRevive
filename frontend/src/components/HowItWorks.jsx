import React from "react";

export default function HowItWorks({ steps }) {
  return (
    <section className="how-it-works">
      <div className="container">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Simple steps to smarter inventory management</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <div>{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
