import React from "react";
import { Box } from "lucide-react";

export default function Brand() {
  return (
    <a className="brand" href="/" aria-label="StockRevive home">
      <span className="brand__mark">
        <Box size={22} strokeWidth={2.3} />
      </span>
      <span className="brand__text">StockRevive</span>
    </a>
  );
}
