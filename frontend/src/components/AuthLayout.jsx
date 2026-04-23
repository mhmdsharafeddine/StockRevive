import React from "react";

import Brand from "./Brand.jsx";

export default function AuthLayout({ children, eyebrow, title, subtitle }) {
  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <Brand />
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="auth-points" aria-label="StockRevive benefits">
            <span>Real-time availability</span>
            <span>Retail and wholesale ready</span>
            <span>Insights foundation built in</span>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
