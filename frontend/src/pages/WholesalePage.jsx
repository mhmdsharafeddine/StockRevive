import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Box, Filter, MapPin, PackageSearch, Plus, Search, X } from "lucide-react";

import { createWholesaleListing, createWholesaleOrder, fetchWholesaleListings, getAuthUser } from "../api/homepage.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import { queueSnackbar } from "../utils/snackbar.js";
import { showSnackbar } from "../utils/snackbar.js";

const tabs = ["All Listings", "Critical Stock", "Low Stock", "Nearby"];
const categories = ["CPUs", "GPUs", "Motherboards", "RAM", "Storage", "Power Supplies", "Cooling", "Cases", "Monitors", "Peripherals"];

function formatPrice(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function medianPrice(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function stockClass(status) {
  if (status === "critical") return "wholesale-badge wholesale-badge--critical";
  if (status === "low") return "wholesale-badge wholesale-badge--low";
  return "wholesale-badge wholesale-badge--available";
}

function firstError(error) {
  if (!error || typeof error !== "object") return "Something went wrong.";
  const value = error.product_name ?? error.quantity ?? error.offer_price ?? error.wholesale_price ?? error.available_units ?? error.detail ?? error.non_field_errors;
  return Array.isArray(value) ? value[0] : value ?? "Something went wrong.";
}

function effectiveMinimumOrder(listing) {
  const available = Number(listing?.available_units ?? 0);
  const minimum = Number(listing?.min_order_quantity ?? 1);
  if (available < 1) return minimum;
  return Math.min(minimum, available);
}

function normalizeWholesaleAnomalyWarning(listing) {
  if (!listing?.anomaly_warning) return null;
  if (typeof listing.anomaly_warning === "string") {
    return {
      headline: "Scam warning",
      summary: listing.anomaly_warning,
      detail: "This wholesale listing sits outside the normal market range for the same product.",
    };
  }
  return listing.anomaly_warning;
}

function decorateWholesaleListingsWithAnomalies(listings) {
  if (!Array.isArray(listings) || listings.length === 0) return [];

  const groups = new Map();
  listings.forEach((listing) => {
    const key = `${listing.product_name}::${listing.category}`;
    const current = groups.get(key) ?? [];
    current.push(listing);
    groups.set(key, current);
  });

  return listings.map((listing) => {
    const suppliedWarning = normalizeWholesaleAnomalyWarning(listing);
    if (suppliedWarning) {
      return { ...listing, anomaly_warning: suppliedWarning };
    }

    const comparable = groups.get(`${listing.product_name}::${listing.category}`) ?? [];
    const prices = comparable.map((item) => Number(item.wholesale_price ?? 0)).filter((price) => price > 0);
    if (prices.length < 3) return listing;

    const median = medianPrice(prices);
    if (!median) return listing;

    const price = Number(listing.wholesale_price ?? 0);
    const lowThreshold = median * 0.72;
    const highThreshold = median * 1.35;
    const isLow = price <= lowThreshold;
    const isHigh = price >= highThreshold;

    if (!isLow && !isHigh) return listing;

    const typicalListings = comparable.filter((item) => {
      const itemPrice = Number(item.wholesale_price ?? 0);
      return itemPrice > lowThreshold && itemPrice < highThreshold;
    });
    const typicalPrices = typicalListings.map((item) => Number(item.wholesale_price ?? 0)).filter((itemPrice) => itemPrice > 0);
    const rangeLow = typicalPrices.length ? Math.min(...typicalPrices) : Math.min(...prices);
    const rangeHigh = typicalPrices.length ? Math.max(...typicalPrices) : Math.max(...prices);
    const deviation = Math.round(Math.abs(((price - median) / median) * 100));

    return {
      ...listing,
      anomaly_warning: {
        headline: "Scam warning",
        summary: `${deviation}% ${isLow ? "below" : "above"} the usual wholesale range for this product.`,
        detail: `Comparable listings are around $${formatPrice(rangeLow)}-$${formatPrice(rangeHigh)} per unit. ${isLow ? "Verify authenticity, batch details, and warranty before ordering." : "Double-check the asking price and seller terms before committing to the order."}`,
      },
    };
  });
}

function WholesaleListingModal({ onClose, onCreated }) {
  const user = getAuthUser();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    product_name: "",
    category: "CPUs",
    wholesale_price: "",
    available_units: "10",
    min_order_quantity: "5",
    city: user?.profile?.city ?? "Beirut",
    description: "",
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const listing = await createWholesaleListing({
        ...form,
        demand_level: "medium",
        is_trending: false,
      });
      onCreated(listing);
      showSnackbar("Wholesale listing created.");
      onClose();
    } catch (apiError) {
      setError(firstError(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="wholesale-listing-title">
      <div className="listing-modal__panel wholesale-modal">
        <button className="listing-modal__close" type="button" onClick={onClose} aria-label="Close wholesale listing form">
          <X size={20} />
        </button>
        <div className="listing-modal__header">
          <h2 id="wholesale-listing-title">Add Wholesale Listing</h2>
          <p>
            Listing as <strong>{user?.profile?.store_name ?? "your store"}</strong>. Your store identity is attached automatically.
          </p>
        </div>
        {error && <div className="auth-alert auth-alert--error">{error}</div>}
        <form className="listing-form" onSubmit={handleSubmit}>
          <div className="listing-form__grid">
            <label>
              Product name *
              <input name="product_name" value={form.product_name} onChange={updateField} placeholder="Intel Core i7 bulk tray" required />
            </label>
            <label>
              Category *
              <select name="category" value={form.category} onChange={updateField} required>
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Wholesale price *
              <input min="0" name="wholesale_price" value={form.wholesale_price} onChange={updateField} placeholder="330" step="0.01" type="number" required />
            </label>
            <label>
              Available units *
              <input min="1" name="available_units" value={form.available_units} onChange={updateField} type="number" required />
            </label>
            <label>
              Minimum order quantity *
              <input min="1" name="min_order_quantity" value={form.min_order_quantity} onChange={updateField} type="number" required />
            </label>
            <label>
              City
              <input name="city" value={form.city} onChange={updateField} />
            </label>
            <label className="listing-form__full">
              Description
              <textarea name="description" value={form.description} onChange={updateField} placeholder="Mention warranty, batch details, box condition, or delivery notes." />
            </label>
          </div>
          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating..." : "Create Wholesale Listing"}
            <Plus size={19} />
          </button>
        </form>
      </div>
    </div>
  );
}

function WholesaleActionModal({ listing, action, listings, onClose, onCreated }) {
  const [selectedId, setSelectedId] = useState(listing?.id ?? listings[0]?.id ?? "");
  const activeListing = listings.find((item) => String(item.id) === String(selectedId)) ?? listing;
  const [quantity, setQuantity] = useState(effectiveMinimumOrder(activeListing));
  const [offerPrice, setOfferPrice] = useState(activeListing?.wholesale_price ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeListing) {
      setQuantity(effectiveMinimumOrder(activeListing));
      setOfferPrice(activeListing.wholesale_price);
    }
  }, [activeListing?.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await createWholesaleOrder(activeListing.id, {
        request_type: action === "offer" ? "offer" : "stock_request",
        quantity,
        offer_price: action === "offer" ? offerPrice : "",
        message,
      });
      onCreated(data.listing);
      showSnackbar(data.message);
      onClose();
    } catch (apiError) {
      setError(firstError(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activeListing) return null;

  return (
    <div className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="wholesale-action-title">
      <div className="listing-modal__panel wholesale-modal">
        <button className="listing-modal__close" type="button" onClick={onClose} aria-label="Close wholesale form">
          <X size={20} />
        </button>
        <div className="listing-modal__header">
          <h2 id="wholesale-action-title">{action === "offer" ? "Send Wholesale Offer" : "Request Wholesale Stock"}</h2>
          <p>Wholesale orders are available only between verified business accounts.</p>
        </div>
        {error && <div className="auth-alert auth-alert--error">{error}</div>}
        <form className="listing-form" onSubmit={handleSubmit}>
          <div className="listing-form__grid">
            <label>
              Listing
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                {listings.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product_name} - {item.store?.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity
              <input min={effectiveMinimumOrder(activeListing)} max={activeListing.available_units} type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </label>
            {action === "offer" && (
              <label>
                Offer price per unit
                <input min="0" step="0.01" type="number" value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} required />
              </label>
            )}
            <label className="listing-form__full">
              Message
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add terms, delivery window, or payment notes." />
            </label>
          </div>
          <button className="auth-submit" disabled={isSubmitting || Number(activeListing.available_units) < 1} type="submit">
            {isSubmitting ? "Sending..." : action === "offer" ? "Send Offer" : "Request Stock"}
          </button>
        </form>
      </div>
    </div>
  );
}

function WholesaleCard({ listing, onAction }) {
  return (
    <article className="wholesale-card">
      <div className="wholesale-card__main">
        <div className="wholesale-card__title">
          <h2>{listing.product_name}</h2>
        </div>
        <p>{listing.store?.name}</p>
        <div className="wholesale-card__badges">
          <span className={stockClass(listing.stock_status)}>
            {listing.stock_status === "critical" && <AlertTriangle size={14} />}
            {listing.stock_status_label}
          </span>
          <span className="wholesale-badge">{listing.category}</span>
          <span className="wholesale-badge">Min {effectiveMinimumOrder(listing)} units</span>
        </div>
        <p className="wholesale-card__location">
          <MapPin size={17} />
          {listing.city || listing.store?.city || "Beirut"} - {listing.distance_miles} mi
        </p>
        {listing.description && <p className="wholesale-card__description">{listing.description}</p>}
        {listing.anomaly_warning && (
          <div className="wholesale-card__anomaly" role="note" aria-label={`${listing.anomaly_warning.headline}: ${listing.anomaly_warning.summary}`}>
            <div className="wholesale-card__anomaly-title">
              <AlertTriangle size={16} />
              <strong>{listing.anomaly_warning.headline}</strong>
            </div>
            <span>{listing.anomaly_warning.summary}</span>
            <p>{listing.anomaly_warning.detail}</p>
          </div>
        )}
      </div>
      <aside className="wholesale-card__side">
        <div className="wholesale-price-box">
          <span>Wholesale Price</span>
          <strong>${formatPrice(listing.wholesale_price)}</strong>
          <span>Available</span>
          <strong>{listing.available_units} units</strong>
        </div>
        <div className="wholesale-card__actions">
          <button type="button" disabled={Number(listing.available_units) < 1} onClick={() => onAction("stock", listing)}>
            Request Stock
          </button>
          <button type="button" disabled={Number(listing.available_units) < 1} onClick={() => onAction("offer", listing)}>
            Send Offer
          </button>
        </div>
      </aside>
    </article>
  );
}

export default function WholesalePage() {
  const user = getAuthUser();
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All Listings");
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      queueSnackbar("Log in with a business account to access wholesale.", "error");
      window.location.assign("/login");
      return;
    }

    if (user.profile?.account_type !== "business") {
      setError("Wholesale marketplace is only available to business accounts.");
      return;
    }

    fetchWholesaleListings()
      .then(setListings)
      .catch((apiError) => setError(apiError.detail ?? "Unable to load wholesale listings."));
  }, []);

  const filteredListings = useMemo(() => {
    return decorateWholesaleListingsWithAnomalies(listings).filter((listing) => {
      const matchesSearch = listing.product_name.toLowerCase().includes(search.toLowerCase()) || listing.category.toLowerCase().includes(search.toLowerCase());
      const matchesTab =
        tab === "All Listings" ||
        (tab === "Critical Stock" && listing.stock_status === "critical") ||
        (tab === "Low Stock" && listing.stock_status === "low") ||
        tab === "Nearby";
      return matchesSearch && matchesTab;
    });
  }, [listings, search, tab]);

  const metrics = useMemo(() => {
    return {
      critical: listings.filter((item) => item.stock_status === "critical").length,
      low: listings.filter((item) => item.stock_status === "low").length,
      totalUnits: listings.reduce((total, item) => total + Number(item.available_units ?? 0), 0),
    };
  }, [listings]);

  function handleAction(action, listing = null) {
    if (!filteredListings.length) {
      showSnackbar("No wholesale listings available for this filter.", "error");
      return;
    }
    setModal({ action, listing });
  }

  function handleOrderCreated(updatedListing) {
    setListings((current) => current.map((item) => (item.id === updatedListing.id ? updatedListing : item)));
  }

  function handleListingCreated(listing) {
    setListings((current) => [listing, ...current]);
  }

  return (
    <>
      <Header activePage="Wholesale" />
      <main className="wholesale-page">
        <section className="wholesale-hero">
          <div>
            <h1>Wholesale Marketplace</h1>
            <p>Browse and list bulk inventory from partner stores</p>
          </div>
          <span>
            <Box size={16} />
            Business Marketplace
          </span>
        </section>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        {!error && (
          <>
            <section className="wholesale-metrics">
              <article className="wholesale-metric wholesale-metric--critical">
                <AlertTriangle size={34} />
                <span>{metrics.critical} Items</span>
                <h2>Critical Stock</h2>
                <p>Listings with fewer than 10 units available</p>
              </article>
              <article className="wholesale-metric wholesale-metric--restock">
                <Box size={34} />
                <span>{metrics.low} Items</span>
                <h2>Low Stock</h2>
                <p>Listings with limited units available</p>
              </article>
              <article className="wholesale-metric wholesale-metric--trending">
                <PackageSearch size={34} />
                <span>{metrics.totalUnits} Units</span>
                <h2>Available Inventory</h2>
                <p>Total wholesale units across partner listings</p>
              </article>
            </section>

            <section className="wholesale-tools">
              <div className="retail-search">
                <Search size={22} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search wholesale listings..." />
              </div>
              <button className="retail-tool-button" type="button" onClick={() => setTab("Critical Stock")}>
                <Filter size={20} />
                Filters
              </button>
              <button className="retail-create-button" type="button" onClick={() => handleAction("stock")}>
                <PackageSearch size={19} />
                Request Stock
              </button>
              <button className="retail-create-button" type="button" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={19} />
                Add Listing
              </button>
            </section>

            <div className="wholesale-tabs">
              {tabs.map((item) => (
                <button className={item === tab ? "wholesale-tab wholesale-tab--active" : "wholesale-tab"} key={item} type="button" onClick={() => setTab(item)}>
                  {item}
                </button>
              ))}
            </div>

            <section className="wholesale-list">
              {filteredListings.map((listing) => (
                <WholesaleCard listing={listing} onAction={handleAction} key={listing.id} />
              ))}
            </section>
          </>
        )}
      </main>
      <Footer />
      {modal && (
        <WholesaleActionModal
          action={modal.action}
          listing={modal.listing}
          listings={filteredListings.length ? filteredListings : listings}
          onClose={() => setModal(null)}
          onCreated={handleOrderCreated}
        />
      )}
      {isCreateModalOpen && <WholesaleListingModal onClose={() => setIsCreateModalOpen(false)} onCreated={handleListingCreated} />}
    </>
  );
}
