import React from "react";
import { PackageSearch } from "lucide-react";

const statusClass = {
  in_stock: "product-card__status--good",
  low_stock: "product-card__status--warn",
  out_of_stock: "product-card__status--bad",
};

export default function ProductCard({ product }) {
  const Icon = product.icon ?? PackageSearch;

  return (
    <article className="product-card">
      <div className="product-card__visual">
        <Icon size={34} strokeWidth={2} />
      </div>
      <div>
        <p>{product.category}</p>
        <h3>{product.name}</h3>
        <span>{product.store?.name}</span>
      </div>
      <div className="product-card__bottom">
        <strong>${Number(product.price).toLocaleString()}</strong>
        <span className={`product-card__status ${statusClass[product.stock_status] ?? ""}`}>
          {product.stock_label}
        </span>
      </div>
    </article>
  );
}
