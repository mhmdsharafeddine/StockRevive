import React from "react";

import Button from "./Button.jsx";

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero__overlay" />
      <div className="container hero__content">
        <div className="eyebrow">Real-Time Inventory Platform</div>
        <h1>Smart Inventory, Smarter Decisions</h1>
        <p>Connect customers and stores through live product availability, retail listings, and wholesale inventory.</p>
        <div className="hero__actions">
          <Button href="#retail" variant="light" withArrow className="button--hero">
            Browse Retail
          </Button>
          <Button href="#wholesale" variant="glass" className="button--hero">
            Explore Wholesale
          </Button>
        </div>
      </div>
    </section>
  );
}
