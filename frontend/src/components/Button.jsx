import React from "react";
import { ArrowRight } from "lucide-react";

export default function Button({ children, variant = "primary", href = "#", withArrow = false, className = "" }) {
  return (
    <a className={`button button--${variant} ${className}`.trim()} href={href}>
      <span>{children}</span>
      {withArrow && <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />}
    </a>
  );
}
