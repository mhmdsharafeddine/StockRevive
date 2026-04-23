import React from "react";

import ProductCard from "./ProductCard.jsx";

export default function ProductPreview({ products }) {
  return (
    <section className="product-preview" aria-labelledby="inventory-preview-title">
      <div className="container">
        <div className="product-preview__header">
          <div>
            <h2 id="inventory-preview-title">Live Product Preview</h2>
            <p>API-backed product cards are ready for the retail marketplace flow.</p>
          </div>
          <a href="#retail">View marketplace</a>
        </div>
        <div className="product-grid">
          {products.slice(0, 3).map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
