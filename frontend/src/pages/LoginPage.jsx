import React, { useState } from "react";
import { ArrowRight, Building2, Mail } from "lucide-react";

import { checkBackendHealth, loginAccount, saveAuthSession } from "../api/homepage.js";
import AuthField from "../components/AuthField.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import { queueSnackbar } from "../utils/snackbar.js";

function firstError(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setErrors((current) => ({ ...current, [name]: "", nonField: "" }));
    setStatus("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setStatus("");

    try {
      const backendIsReady = await checkBackendHealth();

      if (!backendIsReady) {
        throw { code: "backend_offline" };
      }

      const data = await loginAccount({ email: form.email, password: form.password });
      saveAuthSession(data, form.remember);
      queueSnackbar(`Logged in as ${data.user.full_name}.`);
      window.location.assign("/");
    } catch (error) {
      setErrors({
        email: firstError(error.email),
        password: firstError(error.password),
        nonField:
          (error.code === "backend_offline" ? "Backend is offline. Start the Django server and try again." : null) ??
          firstError(error.non_field_errors) ??
          firstError(error.detail) ??
          "Login failed. Check your email and password.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Log in to StockRevive"
      subtitle="Pick up where you left off and keep tracking store availability, deals, and inventory signals."
    >
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-card__header">
          <h2>Login</h2>
          <p>Use your customer or business account.</p>
        </div>
        {errors.nonField && <div className="auth-alert auth-alert--error">{errors.nonField}</div>}
        {status && <div className="auth-alert auth-alert--success">{status}</div>}
        <div className="auth-provider-grid">
          <button type="button">
            <Mail size={18} />
            Email
          </button>
          <button type="button">
            <Building2 size={18} />
            Business
          </button>
        </div>
        <AuthField
          error={errors.email}
          label="Email address"
          name="email"
          onChange={updateField}
          placeholder="you@example.com"
          required
          type="email"
          value={form.email}
        />
        <AuthField
          error={errors.password}
          label="Password"
          name="password"
          onChange={updateField}
          placeholder="Enter your password"
          required
          type="password"
          value={form.password}
        />
        <div className="auth-row">
          <label>
            <input checked={form.remember} name="remember" onChange={updateField} type="checkbox" />
            Remember me
          </label>
          <a href="/signup">Create account</a>
        </div>
        <button className="auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Logging in..." : "Login"}
          <ArrowRight size={19} />
        </button>
      </form>
    </AuthLayout>
  );
}
