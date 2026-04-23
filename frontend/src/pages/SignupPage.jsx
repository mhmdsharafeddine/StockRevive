import React, { useState } from "react";
import { ArrowRight, Building2, UserRound } from "lucide-react";

import { checkBackendHealth, registerAccount, saveAuthSession } from "../api/homepage.js";
import AuthField from "../components/AuthField.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import PasswordStrength, { getPasswordStrength } from "../components/PasswordStrength.jsx";
import { queueSnackbar } from "../utils/snackbar.js";

function firstError(value) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function flattenError(error) {
  if (!error || typeof error !== "object") {
    return "Registration failed. Please make sure the backend is running.";
  }

  return (
    (error.code === "backend_offline" ? "Backend is offline. Start the Django server and try again." : null) ??
    firstError(error.non_field_errors) ??
    firstError(error.detail) ??
    firstError(error.email) ??
    firstError(error.phone) ??
    firstError(error.city) ??
    firstError(error.street_address) ??
    firstError(error.password) ??
    firstError(error.confirm_password) ??
    firstError(error.full_name) ??
    "Registration failed. Please review the form."
  );
}

export default function SignupPage() {
  const [accountType, setAccountType] = useState("customer");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    city: "",
    street_address: "",
    building_details: "",
    store_name: "",
    business_phone: "",
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "", nonField: "" }));
    setStatus("");
  }

  function updateAccountType(nextType) {
    setAccountType(nextType);
    setErrors({});
    setStatus("");
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.full_name.trim()) nextErrors.full_name = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email address is required.";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!form.city.trim()) nextErrors.city = "City is required.";
    if (!form.street_address.trim()) nextErrors.street_address = "Street address is required.";
    if (accountType === "business" && !form.store_name.trim()) nextErrors.store_name = "Store name is required.";
    if (!form.password) nextErrors.password = "Password is required.";
    if (getPasswordStrength(form.password).score < 3) nextErrors.password = "Please choose a stronger password.";
    if (form.password !== form.confirm_password) nextErrors.confirm_password = "Passwords do not match.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const backendIsReady = await checkBackendHealth();

      if (!backendIsReady) {
        throw { code: "backend_offline" };
      }

      const data = await registerAccount({
        ...form,
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        account_type: accountType,
      });
      saveAuthSession(data, true);
      queueSnackbar(`Account created for ${data.user.full_name}.`);
      window.location.assign("/");
    } catch (error) {
      setErrors({
        full_name: firstError(error.full_name),
        email: firstError(error.email),
        phone: firstError(error.phone),
        city: firstError(error.city),
        street_address: firstError(error.street_address),
        building_details: firstError(error.building_details),
        store_name: firstError(error.store_name),
        business_phone: firstError(error.business_phone),
        password: firstError(error.password),
        confirm_password: firstError(error.confirm_password),
        nonField: flattenError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Start smart"
      title="Create your StockRevive account"
      subtitle="Join as a customer looking for electronics or as a store managing product availability."
    >
      <form className="auth-card auth-card--wide" onSubmit={handleSubmit}>
        <div className="auth-card__header">
          <h2>Sign up</h2>
          <p>
            Choose the account that fits how you will use StockRevive.
            <span className="required-note"> * required fields</span>
          </p>
        </div>
        {errors.nonField && <div className="auth-alert auth-alert--error">{errors.nonField}</div>}
        {status && <div className="auth-alert auth-alert--success">{status}</div>}
        <div className="account-toggle" role="radiogroup" aria-label="Account type">
          <button
            className={accountType === "customer" ? "account-toggle__option account-toggle__option--active" : "account-toggle__option"}
            type="button"
            onClick={() => updateAccountType("customer")}
          >
            <UserRound size={24} />
            <span>Normal User</span>
            <small>Search products and compare store availability</small>
          </button>
          <button
            className={accountType === "business" ? "account-toggle__option account-toggle__option--active" : "account-toggle__option"}
            type="button"
            onClick={() => updateAccountType("business")}
          >
            <Building2 size={24} />
            <span>Business Account</span>
            <small>Manage store listings, inventory, and wholesale flow</small>
          </button>
        </div>
        <div className="auth-form-grid">
          <AuthField
            error={errors.full_name}
            label="Full name"
            name="full_name"
            onChange={updateField}
            placeholder="Maya Haddad"
            required
            value={form.full_name}
          />
          <AuthField
            error={errors.email}
            label="Email address"
            name="email"
            onChange={updateField}
            placeholder="maya@example.com"
            required
            type="email"
            value={form.email}
          />
          <AuthField
            error={errors.phone}
            label="Phone number"
            name="phone"
            onChange={updateField}
            placeholder="+961 70 000 000"
            required
            type="tel"
            value={form.phone}
          />
          <AuthField
            error={errors.city}
            label="City"
            name="city"
            onChange={updateField}
            placeholder="Beirut"
            required
            value={form.city}
          />
          <AuthField
            error={errors.street_address}
            label="Street address"
            name="street_address"
            onChange={updateField}
            placeholder="Hamra Main Street"
            required
            value={form.street_address}
          />
          <AuthField
            error={errors.building_details}
            label="Building details"
            name="building_details"
            onChange={updateField}
            placeholder="Floor 2, office 204"
            value={form.building_details}
          />
          {accountType === "business" && (
            <>
              <AuthField
                error={errors.store_name}
                label="Store name"
                name="store_name"
                onChange={updateField}
                placeholder="TechHub Beirut"
                required
                value={form.store_name}
              />
              <AuthField
                error={errors.business_phone}
                label="Business phone"
                name="business_phone"
                onChange={updateField}
                placeholder="Leave blank to use account phone"
                type="tel"
                value={form.business_phone}
              />
            </>
          )}
          <div className="password-field-group">
            <AuthField
              error={errors.password}
              label="Password"
              name="password"
              onChange={updateField}
              placeholder="Create a password"
              required
              type="password"
              value={form.password}
            />
            <AuthField
              error={errors.confirm_password}
              label="Confirm password"
              name="confirm_password"
              onChange={updateField}
              placeholder="Repeat password"
              required
              type="password"
              value={form.confirm_password}
            />
            <PasswordStrength password={form.password} />
          </div>
        </div>
        <button className="auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating account..." : `Create ${accountType === "business" ? "Business" : "User"} Account`}
          <ArrowRight size={19} />
        </button>
        <p className="auth-switch">
          Already have an account? <a href="/login">Login</a>
        </p>
      </form>
    </AuthLayout>
  );
}
