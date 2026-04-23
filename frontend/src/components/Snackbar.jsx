import React, { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export default function Snackbar({ toast, onClose }) {
  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) {
    return null;
  }

  return (
    <div className={`snackbar snackbar--${toast.type ?? "success"}`} role="status" aria-live="polite">
      <CheckCircle2 size={21} />
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Close notification">
        <X size={18} />
      </button>
    </div>
  );
}
