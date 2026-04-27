import React from "react";

import Button from "./Button.jsx";

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero__overlay" />
      <div className="container hero__content">
        <h1>Lebanon&apos;s Tech Market, Finally in One Place</h1>
        <p>
          Discover laptops, phones, parts, and accessories from sellers across Lebanon. Compare offers, check live
          availability, and shop the country&apos;s fragmented tech market through one easy marketplace.
        </p>
        <div className="hero__actions">
          <Button href="#retail" variant="light" withArrow className="button--hero">
            Shop Retail
          </Button>
          <Button href="#wholesale" variant="glass" className="button--hero">
            Explore Wholesale
          </Button>
        </div>
      </div>
    </section>
  );
}
