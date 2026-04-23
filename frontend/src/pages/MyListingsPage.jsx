import React, { useEffect, useState } from "react";
import { Box, CalendarClock, Eye, PackageCheck, Pencil, Phone, Plus, Save, Store, Trash2, Upload, X } from "lucide-react";

import {
  deleteProductListing,
  deleteWholesaleListing,
  fetchMyListings,
  getAuthUser,
  updateProductListing,
  updateWholesaleListing,
} from "../api/homepage.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import { queueSnackbar } from "../utils/snackbar.js";

function formatPrice(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function requestLabel(request) {
  return `${request.request_type_label} from ${request.requester_name}`;
}

function wholesaleOrderLabel(order) {
  return `${order.request_type_label} from ${order.buyer?.name ?? "buyer"}`;
}

function firstError(error) {
  if (!error || typeof error !== "object") return "Unable to save listing.";
  const value =
    error.name ??
    error.product_name ??
    error.price ??
    error.wholesale_price ??
    error.category ??
    error.quantity ??
    error.available_units ??
    error.min_order_quantity ??
    error.condition ??
    error.image ??
    error.detail ??
    error.non_field_errors;
  return Array.isArray(value) ? value[0] : value ?? "Unable to save listing.";
}

const categories = [
  "CPUs",
  "GPUs",
  "Motherboards",
  "RAM",
  "Storage",
  "Power Supplies",
  "Cooling",
  "Cases",
  "Monitors",
  "Peripherals",
];

function EditRetailListingModal({ listing, onClose, onSaved }) {
  const [preview, setPreview] = useState(listing.photo_url || listing.image || listing.image_url || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: listing.name ?? "",
    category: listing.category ?? "CPUs",
    price: listing.price ?? "",
    quantity: listing.quantity ?? "1",
    condition: listing.condition ?? "new",
    stock_status: listing.stock_status ?? "in_stock",
    store_city: listing.store?.city ?? "Beirut",
    description: listing.description ?? "",
    image: null,
  });

  function updateField(event) {
    const { files, name, value } = event.target;

    if (name === "image") {
      const file = files?.[0] ?? null;
      setForm((current) => ({ ...current, image: file }));
      setPreview(file ? URL.createObjectURL(file) : preview);
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== "") {
        payload.append(key, value);
      }
    });

    try {
      const updated = await updateProductListing(listing.id, payload);
      onSaved(updated);
      onClose();
    } catch (apiError) {
      setError(firstError(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="edit-retail-listing-title">
      <div className="listing-modal__panel">
        <button className="listing-modal__close" type="button" onClick={onClose} aria-label="Close edit listing form">
          <X size={20} />
        </button>
        <div className="listing-modal__header">
          <h2 id="edit-retail-listing-title">Edit Retail Listing</h2>
          <p>Update price, stock, product details, and the listing photo.</p>
        </div>
        {error && <div className="auth-alert auth-alert--error">{error}</div>}
        <form className="listing-form" onSubmit={handleSubmit}>
          <label className="listing-upload">
            {preview ? <img src={preview} alt="Product preview" /> : <Upload size={34} />}
            <span>{preview ? "Change photo" : "Upload product photo"}</span>
            <input accept="image/*" name="image" onChange={updateField} type="file" />
          </label>
          <div className="listing-form__grid">
            <label>
              Product name *
              <input name="name" onChange={updateField} required value={form.name} />
            </label>
            <label>
              Category *
              <select name="category" onChange={updateField} required value={form.category}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price *
              <input min="0" name="price" onChange={updateField} required step="0.01" type="number" value={form.price} />
            </label>
            <label>
              Quantity available *
              <input min="0" name="quantity" onChange={updateField} required type="number" value={form.quantity} />
            </label>
            <label>
              Condition *
              <select name="condition" onChange={updateField} required value={form.condition}>
                <option value="new">New</option>
                <option value="open_box">Open box</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </label>
            <label>
              Stock status *
              <select name="stock_status" onChange={updateField} required value={form.stock_status}>
                <option value="in_stock">In stock</option>
                <option value="low_stock">Low stock</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </label>
            <label>
              Store city
              <input name="store_city" onChange={updateField} value={form.store_city} />
            </label>
            <label className="listing-form__full">
              Description
              <textarea name="description" onChange={updateField} value={form.description} />
            </label>
          </div>
          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save Retail Listing"}
            <Save size={19} />
          </button>
        </form>
      </div>
    </div>
  );
}

function EditWholesaleListingModal({ listing, onClose, onSaved }) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    product_name: listing.product_name ?? "",
    category: listing.category ?? "CPUs",
    wholesale_price: listing.wholesale_price ?? "",
    available_units: listing.available_units ?? "1",
    min_order_quantity: listing.min_order_quantity ?? "1",
    city: listing.city ?? listing.store?.city ?? "Beirut",
    description: listing.description ?? "",
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const updated = await updateWholesaleListing(listing.id, form);
      onSaved(updated);
      onClose();
    } catch (apiError) {
      setError(firstError(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="edit-wholesale-listing-title">
      <div className="listing-modal__panel wholesale-modal">
        <button className="listing-modal__close" type="button" onClick={onClose} aria-label="Close wholesale edit form">
          <X size={20} />
        </button>
        <div className="listing-modal__header">
          <h2 id="edit-wholesale-listing-title">Edit Wholesale Listing</h2>
          <p>Your store name is attached automatically. Update the bulk stock, minimum order, and pricing here.</p>
        </div>
        {error && <div className="auth-alert auth-alert--error">{error}</div>}
        <form className="listing-form" onSubmit={handleSubmit}>
          <div className="listing-form__grid">
            <label>
              Product name *
              <input name="product_name" onChange={updateField} required value={form.product_name} />
            </label>
            <label>
              Category *
              <select name="category" onChange={updateField} required value={form.category}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Wholesale price *
              <input min="0" name="wholesale_price" onChange={updateField} required step="0.01" type="number" value={form.wholesale_price} />
            </label>
            <label>
              Available units *
              <input min="0" name="available_units" onChange={updateField} required type="number" value={form.available_units} />
            </label>
            <label>
              Minimum order quantity *
              <input min="1" name="min_order_quantity" onChange={updateField} required type="number" value={form.min_order_quantity} />
            </label>
            <label>
              City
              <input name="city" onChange={updateField} value={form.city} />
            </label>
            <label className="listing-form__full">
              Description
              <textarea name="description" onChange={updateField} value={form.description} />
            </label>
          </div>
          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save Wholesale Listing"}
            <Save size={19} />
          </button>
        </form>
      </div>
    </div>
  );
}

function ListingSection({ title, subtitle, count, emptyText, children }) {
  return (
    <section className="my-listings-section">
      <div className="my-listings-section__header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span>{count} listed</span>
      </div>
      {count === 0 ? <div className="my-listings-empty">{emptyText}</div> : children}
    </section>
  );
}

export default function MyListingsPage() {
  const user = getAuthUser();
  const [retailListings, setRetailListings] = useState([]);
  const [wholesaleListings, setWholesaleListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingRetailListing, setEditingRetailListing] = useState(null);
  const [editingWholesaleListing, setEditingWholesaleListing] = useState(null);

  useEffect(() => {
    if (!user) {
      queueSnackbar("Log in to view your listings.", "error");
      window.location.assign("/login");
      return;
    }

    fetchMyListings()
      .then((data) => {
        if (Array.isArray(data)) {
          setRetailListings(data);
          setWholesaleListings([]);
          return;
        }
        setRetailListings(data.retail ?? []);
        setWholesaleListings(data.wholesale ?? []);
      })
      .catch(() => setError("Unable to load your listings."))
      .finally(() => setIsLoading(false));
  }, []);

  const isBusiness = user?.profile?.account_type === "business";
  const hasListings = retailListings.length > 0 || wholesaleListings.length > 0;

  function handleRetailSaved(updatedListing) {
    setRetailListings((current) => current.map((listing) => (listing.id === updatedListing.id ? { ...listing, ...updatedListing } : listing)));
    queueSnackbar("Retail listing updated successfully.");
  }

  function handleWholesaleSaved(updatedListing) {
    setWholesaleListings((current) => current.map((listing) => (listing.id === updatedListing.id ? { ...listing, ...updatedListing } : listing)));
    queueSnackbar("Wholesale listing updated successfully.");
  }

  async function handleDeleteRetail(listing) {
    const shouldDelete = window.confirm(`Delete ${listing.name} from the retail marketplace?`);
    if (!shouldDelete) return;

    try {
      await deleteProductListing(listing.id);
      setRetailListings((current) => current.filter((item) => item.id !== listing.id));
      queueSnackbar("Retail listing deleted.");
    } catch (apiError) {
      queueSnackbar(firstError(apiError), "error");
    }
  }

  async function handleDeleteWholesale(listing) {
    const shouldDelete = window.confirm(`Delete ${listing.product_name} from the wholesale marketplace?`);
    if (!shouldDelete) return;

    try {
      await deleteWholesaleListing(listing.id);
      setWholesaleListings((current) => current.filter((item) => item.id !== listing.id));
      queueSnackbar("Wholesale listing deleted.");
    } catch (apiError) {
      queueSnackbar(firstError(apiError), "error");
    }
  }

  return (
    <>
      <Header activePage="Retail" />
      <main className="my-listings-page">
        <section className="my-listings-hero">
          <div>
            <span>Seller dashboard</span>
            <h1>My Listings</h1>
            <p>Manage your retail marketplace items and wholesale bulk inventory from one place.</p>
          </div>
          {isBusiness && (
            <div className="my-listings-hero__actions">
              <a className="retail-create-button" href="/retail">
                <Plus size={19} />
                Create Retail Listing
              </a>
              <a className="retail-create-button" href="/wholesale">
                <Plus size={19} />
                Create Wholesale Listing
              </a>
            </div>
          )}
        </section>

        {!isBusiness && <div className="auth-alert auth-alert--error">My Listings is only available for business accounts.</div>}

        {error && <div className="auth-alert auth-alert--error">{error}</div>}
        {isLoading && <div className="my-listings-empty">Loading your listings...</div>}

        {!isLoading && isBusiness && !hasListings && (
          <div className="my-listings-empty">
            <h2>No listings yet</h2>
            <p>Create your first retail or wholesale listing so buyers can find your stock.</p>
            <div className="my-listings-empty__actions">
              <a className="retail-create-button" href="/retail">
                <Plus size={19} />
                Create Retail Listing
              </a>
              <a className="retail-create-button" href="/wholesale">
                <Plus size={19} />
                Create Wholesale Listing
              </a>
            </div>
          </div>
        )}

        {!isLoading && isBusiness && hasListings && (
          <div className="my-listings-sections">
            <ListingSection
              title="Retail Listings"
              subtitle="Products customers can reserve or request for delivery."
              count={retailListings.length}
              emptyText="No retail listings yet."
            >
              <div className="my-listings-grid">
                {retailListings.map((listing) => {
                  const image = listing.photo_url || listing.image || listing.image_url;

                  return (
                    <article className="my-listing-card" key={listing.id}>
                      <button className="my-listing-card__trash" type="button" onClick={() => handleDeleteRetail(listing)} aria-label={`Delete ${listing.name}`}>
                        <Trash2 size={18} />
                      </button>
                      <div className="my-listing-card__top">
                        <div className="my-listing-card__media">
                          {image ? <img src={image} alt={listing.name} /> : <Box size={46} />}
                        </div>
                        <div>
                          <span>{listing.category}</span>
                          <h2>{listing.name}</h2>
                          <p>{listing.description || `${listing.condition_label} product listed by your store.`}</p>
                        </div>
                      </div>

                      <div className="my-listing-card__stats">
                        <div>
                          <small>Price</small>
                          <strong>${formatPrice(listing.price)}</strong>
                        </div>
                        <div>
                          <small>Quantity</small>
                          <strong>{listing.quantity}</strong>
                        </div>
                        <div>
                          <small>Status</small>
                          <strong>{listing.stock_label}</strong>
                        </div>
                        <div>
                          <small>Requests</small>
                          <strong>{listing.pending_requests_count} pending</strong>
                        </div>
                      </div>

                      <div className="my-listing-card__details">
                        <span>
                          <Store size={16} />
                          {listing.store?.name} - {listing.store?.city}
                        </span>
                        {listing.seller_phone && (
                          <span>
                            <Phone size={16} />
                            {listing.seller_phone}
                          </span>
                        )}
                        <span>
                          <CalendarClock size={16} />
                          Updated {formatDate(listing.updated_at)}
                        </span>
                        <span>
                          <PackageCheck size={16} />
                          {listing.requests_count} total requests
                        </span>
                      </div>

                      <div className="my-listing-card__requests">
                        <h3>Recent Requests</h3>
                        {listing.recent_requests.length === 0 ? (
                          <p>No customer requests yet.</p>
                        ) : (
                          listing.recent_requests.map((request) => (
                            <div className="my-listing-request" key={request.id}>
                              <div>
                                <strong>{requestLabel(request)}</strong>
                                <span>{formatDate(request.created_at)}</span>
                              </div>
                              <small>{request.status_label}</small>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="my-listing-card__actions">
                        <button type="button" onClick={() => setEditingRetailListing(listing)}>
                          <Pencil size={17} />
                          Edit Listing
                        </button>
                        <a className="my-listing-card__link" href={`/retail/product/${listing.id}`}>
                          <Eye size={17} />
                          View Marketplace Details
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </ListingSection>

            <ListingSection
              title="Wholesale Listings"
              subtitle="Bulk inventory visible only to business accounts."
              count={wholesaleListings.length}
              emptyText="No wholesale listings yet."
            >
              <div className="my-listings-grid">
                {wholesaleListings.map((listing) => (
                  <article className="my-listing-card my-listing-card--wholesale" key={listing.id}>
                    <button className="my-listing-card__trash" type="button" onClick={() => handleDeleteWholesale(listing)} aria-label={`Delete ${listing.product_name}`}>
                      <Trash2 size={18} />
                    </button>
                    <div className="my-listing-card__top">
                      <div className="my-listing-card__media">
                        <Box size={46} />
                      </div>
                      <div>
                        <span>{listing.category}</span>
                        <h2>{listing.product_name}</h2>
                        <p>{listing.description || "Bulk inventory listed for verified business buyers."}</p>
                      </div>
                    </div>

                    <div className="my-listing-card__stats">
                      <div>
                        <small>Wholesale price</small>
                        <strong>${formatPrice(listing.wholesale_price)}</strong>
                      </div>
                      <div>
                        <small>Available</small>
                        <strong>{listing.available_units} units</strong>
                      </div>
                      <div>
                        <small>Minimum order</small>
                        <strong>{listing.min_order_quantity}</strong>
                      </div>
                      <div>
                        <small>Orders</small>
                        <strong>{listing.pending_orders_count} pending</strong>
                      </div>
                    </div>

                    <div className="my-listing-card__details">
                      <span>
                        <Store size={16} />
                        {listing.store?.name} - {listing.city || listing.store?.city}
                      </span>
                      <span>
                        <CalendarClock size={16} />
                        Updated {formatDate(listing.updated_at)}
                      </span>
                      <span>
                        <PackageCheck size={16} />
                        {listing.orders_count} total orders
                      </span>
                      <span>
                        <Box size={16} />
                        {listing.stock_status_label}
                      </span>
                    </div>

                    <div className="my-listing-card__requests">
                      <h3>Recent Wholesale Orders</h3>
                      {listing.recent_orders.length === 0 ? (
                        <p>No wholesale orders yet.</p>
                      ) : (
                        listing.recent_orders.map((order) => (
                          <div className="my-listing-request" key={order.id}>
                            <div>
                              <strong>{wholesaleOrderLabel(order)}</strong>
                              <span>
                                {order.quantity} units - {formatDate(order.created_at)}
                              </span>
                            </div>
                            <small>{order.status_label}</small>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="my-listing-card__actions">
                      <button type="button" onClick={() => setEditingWholesaleListing(listing)}>
                        <Pencil size={17} />
                        Edit Listing
                      </button>
                      <a className="my-listing-card__link" href="/wholesale">
                        <Eye size={17} />
                        View Wholesale Marketplace
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </ListingSection>
          </div>
        )}
      </main>
      <Footer />
      {editingRetailListing && (
        <EditRetailListingModal
          listing={editingRetailListing}
          onClose={() => setEditingRetailListing(null)}
          onSaved={handleRetailSaved}
        />
      )}
      {editingWholesaleListing && (
        <EditWholesaleListingModal
          listing={editingWholesaleListing}
          onClose={() => setEditingWholesaleListing(null)}
          onSaved={handleWholesaleSaved}
        />
      )}
    </>
  );
}
