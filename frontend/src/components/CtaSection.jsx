import React from "react";

import Button from "./Button.jsx";

export default function CtaSection() {
  return (
    <section className="cta-section">
      <div className="container cta-section__content">
        <h2>Ready to Transform Your Inventory?</h2>
        <p>Join hundreds of stores and thousands of customers already using StockRevive</p>
        <div className="cta-section__actions">
          <Button href="/signup" variant="light" withArrow>
            Get Started Free
          </Button>
          <Button href="#demo" variant="glass">
            Schedule Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
