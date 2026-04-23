import React, { useEffect, useMemo, useState } from "react";
import { Box, FileSpreadsheet, PackageOpen, Plus, Search, Upload, X } from "lucide-react";

import { createListingFromStock, fetchStockItems, getAuthUser, uploadStockSheet } from "../api/homepage.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import { queueSnackbar } from "../utils/snackbar.js";

const templateUrl = "/templates/stockrevive_stock_template.csv";

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function firstError(error) {
  if (!error || typeof error !== "object") return "Something went wrong.";
  const value = error.file ?? error.quantity ?? error.price ?? error.listing_type ?? error.detail ?? error.non_field_errors;
  return Array.isArray(value) ? value[0] : value ?? "Something went wrong.";
}

function StockListingModal({ item, onClose, onCreated }) {
  const [listingType, setListingType] = useState("retail");
  const [quantity, setQuantity] = useState(Math.max(Number(item.quantity ?? 1), 1));
  const [price, setPrice] = useState(item.suggested_retail_price || "");
  const [minOrderQuantity, setMinOrderQuantity] = useState(item.min_order_quantity || 1);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeListingType(nextType) {
    setListingType(nextType);
    setPrice(nextType === "retail" ? item.suggested_retail_price || "" : item.suggested_wholesale_price || "");
    setQuantity(Math.max(Number(item.quantity ?? 1), 1));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const result = await createListingFromStock(item.id, {
        listing_type: listingType,
        quantity,
        price,
        min_order_quantity: minOrderQuantity,
      });
      onCreated(result.stock_item);
      queueSnackbar(result.message);
      onClose();
    } catch (apiError) {
      setError(firstError(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="stock-listing-title">
      <div className="listing-modal__panel stock-modal">
        <button className="listing-modal__close" type="button" onClick={onClose} aria-label="Close stock listing form">
          <X size={20} />
        </button>
        <div className="listing-modal__header">
          <h2 id="stock-listing-title">Create Listing from Stock</h2>
          <p>{item.product_name} has {item.quantity} units available in depot stock.</p>
        </div>
        {error && <div className="auth-alert auth-alert--error">{error}</div>}
        <form className="listing-form" onSubmit={handleSubmit}>
          <div className="stock-listing-toggle">
            <button className={listingType === "retail" ? "stock-toggle stock-toggle--active" : "stock-toggle"} type="button" onClick={() => changeListingType("retail")}>
              Retail Listing
            </button>
            <button className={listingType === "wholesale" ? "stock-toggle stock-toggle--active" : "stock-toggle"} type="button" onClick={() => changeListingType("wholesale")}>
              Wholesale Listing
            </button>
          </div>
          <div className="listing-form__grid">
            <label>
              Quantity to list *
              <input min="1" max={item.quantity} type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </label>
            <label>
              {listingType === "retail" ? "Retail price" : "Wholesale price"} *
              <input min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} required />
            </label>
            {listingType === "wholesale" && (
              <label>
                Minimum order quantity *
                <input min="1" max={quantity} type="number" value={minOrderQuantity} onChange={(event) => setMinOrderQuantity(event.target.value)} required />
              </label>
            )}
          </div>
          <button className="auth-submit" disabled={isSubmitting || Number(item.quantity) < 1} type="submit">
            {isSubmitting ? "Creating..." : "Create Listing"}
            <Plus size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MyStockPage() {
  const user = getAuthUser();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!user) {
      queueSnackbar("Log in to view stock.", "error");
      window.location.assign("/login");
      return;
    }

    if (user.profile?.account_type !== "business") {
      setError("My Stock is only available for business accounts.");
      setIsLoading(false);
      return;
    }

    fetchStockItems()
      .then(setItems)
      .catch((apiError) => setError(apiError.detail ?? "Unable to load stock."))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.sku, item.product_name, item.category, item.depot_location].some((value) => String(value ?? "").toLowerCase().includes(needle)),
    );
  }, [items, search]);

  const totals = useMemo(() => {
    return {
      products: items.length,
      units: items.reduce((total, item) => total + Number(item.quantity ?? 0), 0),
      ready: items.filter((item) => Number(item.quantity ?? 0) > 0).length,
    };
  }, [items]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setIsUploading(true);
    setError("");

    try {
      const result = await uploadStockSheet(formData);
      setItems((current) => [...result.items, ...current]);
      queueSnackbar(`${result.imported_count} stock items imported.`);
    } catch (apiError) {
      setError(firstError(apiError));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function handleListingCreated(updatedItem) {
    setItems((current) => current.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
  }

  return (
    <>
      <Header activePage="My Stock" />
      <main className="stock-page">
        <section className="stock-hero">
          <div>
            <span>Depot inventory</span>
            <h1>My Stock</h1>
            <p>Upload your store stock sheet, review depot items, and move units into retail or wholesale marketplaces.</p>
          </div>
          <div className="stock-hero__actions">
            <a className="retail-tool-button" href={templateUrl} download>
              <FileSpreadsheet size={18} />
              Download Template
            </a>
            <label className="retail-create-button">
              <Upload size={18} />
              {isUploading ? "Uploading..." : "Upload Stock Sheet"}
              <input accept=".csv,.xlsx" onChange={handleUpload} type="file" />
            </label>
          </div>
        </section>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        <section className="stock-metrics">
          <article>
            <span>Total Products</span>
            <strong>{totals.products}</strong>
          </article>
          <article>
            <span>Depot Units</span>
            <strong>{totals.units}</strong>
          </article>
          <article>
            <span>Ready to List</span>
            <strong>{totals.ready}</strong>
          </article>
        </section>

        <section className="stock-tools">
          <div className="retail-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stock by SKU, product, category, or depot..." />
          </div>
          <p>Use the downloaded template in Excel, fill your stock rows, then upload the saved CSV or XLSX file here.</p>
        </section>

        {isLoading && <div className="my-listings-empty">Loading stock...</div>}

        {!isLoading && filteredItems.length === 0 && (
          <div className="stock-empty">
            <PackageOpen size={42} />
            <h2>No stock items yet</h2>
            <p>Download the StockRevive template, add your depot products, and upload it to start creating marketplace listings.</p>
          </div>
        )}

        {!isLoading && filteredItems.length > 0 && (
          <section className="stock-grid">
            {filteredItems.map((item) => (
              <article className="stock-card" key={item.id}>
                <div className="stock-card__top">
                  <div>
                    <span>{item.sku || "No SKU"}</span>
                    <h2>{item.product_name}</h2>
                    <p>{item.category} - {item.condition_label}</p>
                  </div>
                  <Box size={34} />
                </div>
                <div className="stock-card__stats">
                  <div>
                    <small>Depot quantity</small>
                    <strong>{item.quantity} units</strong>
                  </div>
                  <div>
                    <small>Retail price</small>
                    <strong>${formatMoney(item.suggested_retail_price)}</strong>
                  </div>
                  <div>
                    <small>Wholesale price</small>
                    <strong>${formatMoney(item.suggested_wholesale_price)}</strong>
                  </div>
                </div>
                <p>{item.description || "No product notes added."}</p>
                <div className="stock-card__footer">
                  <span>{item.depot_location || "Depot location not set"}</span>
                  <button type="button" disabled={Number(item.quantity) < 1} onClick={() => setSelectedItem(item)}>
                    <Plus size={17} />
                    Create Listing
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
      <Footer />
      {selectedItem && (
        <StockListingModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onCreated={handleListingCreated}
        />
      )}
    </>
  );
}
