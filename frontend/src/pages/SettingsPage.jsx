import React, { useEffect, useState } from "react";
import { Save, Settings } from "lucide-react";

import { getAuthUser, updateAccountSettings, updateStoredUser } from "../api/homepage.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import { queueSnackbar } from "../utils/snackbar.js";
import { showSnackbar } from "../utils/snackbar.js";

function firstError(value) {
  return Array.isArray(value) ? value[0] : value;
}

function flattenError(error) {
  if (!error || typeof error !== "object") {
    return "Unable to update settings.";
  }

  return (
    firstError(error.non_field_errors) ??
    firstError(error.detail) ??
    firstError(error.full_name) ??
    firstError(error.email) ??
    firstError(error.phone) ??
    firstError(error.city) ??
    firstError(error.street_address) ??
    firstError(error.store_name) ??
    firstError(error.business_phone) ??
    "Unable to update settings."
  );
}

function SettingsField({ label, name, value, onChange, error, required = false, type = "text", placeholder = "" }) {
  return (
    <label className="settings-field">
      <span>
        {label}
        {required && <strong>*</strong>}
      </span>
      <input
        aria-invalid={Boolean(error)}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
      {error && <small>{error}</small>}
    </label>
  );
}

export default function SettingsPage() {
  const user = getAuthUser();
  const [form, setForm] = useState({
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    phone: user?.profile?.phone ?? "",
    city: user?.profile?.city ?? "",
    street_address: user?.profile?.street_address ?? "",
    building_details: user?.profile?.building_details ?? "",
    store_name: user?.profile?.store_name ?? "",
    business_phone: user?.profile?.business_phone ?? "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      queueSnackbar("Log in to edit your settings.", "error");
      window.location.assign("/login");
    }
  }, []);

  const isBusiness = user?.profile?.account_type === "business";

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "", nonField: "" }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.full_name.trim()) nextErrors.full_name = "Full name is required.";
    if (!form.email.trim()) nextErrors.email = "Email is required.";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!form.city.trim()) nextErrors.city = "City is required.";
    if (!form.street_address.trim()) nextErrors.street_address = "Street address is required.";
    if (isBusiness && !form.store_name.trim()) nextErrors.store_name = "Store name is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await updateAccountSettings({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        street_address: form.street_address.trim(),
        building_details: form.building_details.trim(),
        store_name: form.store_name.trim(),
        business_phone: form.business_phone.trim(),
      });
      updateStoredUser(data.user);
      showSnackbar("Settings updated successfully.");
      window.dispatchEvent(new Event("stockrevive:auth-updated"));
    } catch (apiError) {
      setErrors({
        full_name: firstError(apiError.full_name),
        email: firstError(apiError.email),
        phone: firstError(apiError.phone),
        city: firstError(apiError.city),
        street_address: firstError(apiError.street_address),
        building_details: firstError(apiError.building_details),
        store_name: firstError(apiError.store_name),
        business_phone: firstError(apiError.business_phone),
        nonField: flattenError(apiError),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Header activePage="Home" />
      <main className="settings-page">
        <section className="settings-hero">
          <span>
            <Settings size={18} />
            Account settings
          </span>
          <h1>Edit Your Details</h1>
          <p>Keep your contact information, address, and store profile accurate for orders and delivery requests.</p>
        </section>

        {errors.nonField && <div className="auth-alert auth-alert--error">{errors.nonField}</div>}

        <form className="settings-card" onSubmit={handleSubmit}>
          <div className="settings-card__section">
            <h2>Account Details</h2>
            <div className="settings-grid">
              <SettingsField
                error={errors.full_name}
                label="Full name"
                name="full_name"
                onChange={updateField}
                required
                value={form.full_name}
              />
              <SettingsField
                error={errors.email}
                label="Email address"
                name="email"
                onChange={updateField}
                required
                type="email"
                value={form.email}
              />
              <SettingsField
                error={errors.phone}
                label="Phone number"
                name="phone"
                onChange={updateField}
                required
                type="tel"
                value={form.phone}
              />
            </div>
          </div>

          <div className="settings-card__section">
            <h2>Address</h2>
            <div className="settings-grid">
              <SettingsField
                error={errors.city}
                label="City"
                name="city"
                onChange={updateField}
                required
                value={form.city}
              />
              <SettingsField
                error={errors.street_address}
                label="Street address"
                name="street_address"
                onChange={updateField}
                required
                value={form.street_address}
              />
              <SettingsField
                error={errors.building_details}
                label="Building details"
                name="building_details"
                onChange={updateField}
                placeholder="Floor, suite, nearby landmark"
                value={form.building_details}
              />
            </div>
          </div>

          {isBusiness && (
            <div className="settings-card__section">
              <h2>Business Profile</h2>
              <div className="settings-grid">
                <SettingsField
                  error={errors.store_name}
                  label="Store name"
                  name="store_name"
                  onChange={updateField}
                  required
                  value={form.store_name}
                />
                <SettingsField
                  error={errors.business_phone}
                  label="Business phone"
                  name="business_phone"
                  onChange={updateField}
                  placeholder="Leave blank to use account phone"
                  type="tel"
                  value={form.business_phone}
                />
              </div>
            </div>
          )}

          <button className="settings-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save Settings"}
            <Save size={19} />
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}
