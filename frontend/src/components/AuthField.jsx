import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function AuthField({ label, type = "text", placeholder, value, onChange, name, required = false, error }) {
  const [isVisible, setIsVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && isVisible ? "text" : type;

  return (
    <label className="auth-field">
      <span>
        {label}
        {required && <strong aria-label="required">*</strong>}
      </span>
      <div className={isPassword ? "auth-field__control auth-field__control--password" : "auth-field__control"}>
        <input
          aria-invalid={Boolean(error)}
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          type={inputType}
          value={value}
        />
        {isPassword && (
          <button
            aria-label={isVisible ? "Hide password" : "Show password"}
            onClick={() => setIsVisible((current) => !current)}
            type="button"
          >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <small>{error}</small>}
    </label>
  );
}
