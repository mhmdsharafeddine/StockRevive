import React from "react";

import Brand from "./Brand.jsx";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <Brand />
          <p>Inventory marketplace connecting customers and stores through live retail and wholesale listings.</p>
        </div>
        <div>
          <h3>Product</h3>
          <a href="#retail">Retail Marketplace</a>
          <a href="#wholesale">Wholesale Marketplace</a>
          <a href="#insights">Insights Dashboard</a>
        </div>
        <div>
          <h3>Company</h3>
          <a href="#about">About Us</a>
          <a href="#careers">Careers</a>
          <a href="#contact">Contact</a>
        </div>
        <div>
          <h3>Legal</h3>
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#cookies">Cookie Policy</a>
        </div>
      </div>
      <div className="container footer__bottom">© 2026 StockRevive. All rights reserved.</div>
    </footer>
  );
}
