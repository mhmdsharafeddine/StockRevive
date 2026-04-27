import React, { useEffect, useMemo, useState } from "react";
import { Box, FileSpreadsheet, PackageOpen, Plus, Search, Trash2, Upload, X } from "lucide-react";

import { createListingFromStock, deleteAllStockItems, deleteStockItem, fetchStockItems, getAuthUser, uploadStockSheet } from "../api/homepage.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import { queueSnackbar } from "../utils/snackbar.js";

const templateUrl = "/templates/stockrevive_stock_template.csv";
const LONG_HELD_DAYS = 60;

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function calculateDaysHeld(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const diff = Date.now() - created.getTime();
  return Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);
}

function prettyPrice(value) {
  const rounded = Math.max(Math.round(Number(value) || 0), 1);
  if (rounded < 100) {
    return Math.max(Math.round(rounded / 5) * 5 - 1, 1);
  }
  return Math.max(Math.round(rounded / 10) * 10 - 1, 1);
}

function getPriceSuggestion(item) {
  const retail = Number(item.suggested_retail_price ?? 0);
  const wholesale = Number(item.suggested_wholesale_price ?? 0);
  const unitCost = Number(item.unit_cost ?? 0);
  const quantity = Number(item.quantity ?? 0);
  const daysHeld = calculateDaysHeld(item.received_at || item.created_at);

  let ageDiscount = 0;
  if (daysHeld >= 180) ageDiscount = 0.18;
  else if (daysHeld >= 120) ageDiscount = 0.13;
  else if (daysHeld >= 90) ageDiscount = 0.09;
  else if (daysHeld >= LONG_HELD_DAYS) ageDiscount = 0.06;

  const quantityDiscount = quantity >= 20 ? 0.05 : quantity >= 10 ? 0.03 : quantity >= 5 ? 0.015 : 0;
  const totalDiscount = Math.min(ageDiscount + quantityDiscount, 0.24);

  const retailFloor = unitCost > 0 ? unitCost * 1.12 : retail * 0.82;
  const wholesaleFloor = unitCost > 0 ? unitCost * 1.05 : wholesale * 0.8;

  const recommendedRetail = prettyPrice(Math.max(retail * (1 - totalDiscount), retailFloor));
  const recommendedWholesale = prettyPrice(Math.max(wholesale * (1 - totalDiscount - 0.02), wholesaleFloor));

  return {
    daysHeld,
    isLongHeld: daysHeld >= LONG_HELD_DAYS,
    recommendedRetail,
    recommendedWholesale,
  };
}

function getAgingLabel(daysHeld) {
  if (daysHeld >= 180) return "Long-held stock";
  if (daysHeld >= 120) return "Aging stock";
  if (daysHeld >= 90) return "Slow-moving stock";
  if (daysHeld >= LONG_HELD_DAYS) return "Watch stock";
  return "Fresh stock";
}

function getAgingClass(daysHeld) {
  if (daysHeld >= 120) return "stock-age-badge stock-age-badge--critical";
  if (daysHeld >= LONG_HELD_DAYS) return "stock-age-badge stock-age-badge--warning";
  return "stock-age-badge";
}

function firstError(error) {
  if (!error || typeof error !== "object") return "Something went wrong.";
  const value = error.file ?? error.quantity ?? error.price ?? error.listing_type ?? error.detail ?? error.non_field_errors;
  return Array.isArray(value) ? value[0] : value ?? "Something went wrong.";
}

function StockListingModal({ item, onClose, onCreated }) {
  const stockInsight = useMemo(() => getPriceSuggestion(item), [item]);
  const defaultRetailPrice = stockInsight.isLongHeld ? stockInsight.recommendedRetail : item.suggested_retail_price || "";
  const defaultWholesalePrice = stockInsight.isLongHeld ? stockInsight.recommendedWholesale : item.suggested_wholesale_price || "";
  const [listingType, setListingType] = useState("retail");
  const [quantity, setQuantity] = useState(Math.max(Number(item.quantity ?? 1), 1));
  const [price, setPrice] = useState(defaultRetailPrice);
  const [minOrderQuantity, setMinOrderQuantity] = useState(item.min_order_quantity || 1);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function changeListingType(nextType) {
    setListingType(nextType);
    setPrice(nextType === "retail" ? defaultRetailPrice : defaultWholesalePrice);
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
        {stockInsight.isLongHeld && (
          <div className="stock-recommendation stock-recommendation--modal">
            <strong>{getAgingLabel(stockInsight.daysHeld)}</strong>
            <span>Held in depot for {stockInsight.daysHeld} days. Suggested quick-list pricing is ready for both retail and wholesale.</span>
          </div>
        )}
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
          <div className="stock-pricing-hints">
            <span>Current suggestion: ${formatMoney(listingType === "retail" ? item.suggested_retail_price : item.suggested_wholesale_price)}</span>
            <button type="button" onClick={() => setPrice(listingType === "retail" ? stockInsight.recommendedRetail : stockInsight.recommendedWholesale)}>
              Use quick-list price ${formatMoney(listingType === "retail" ? stockInsight.recommendedRetail : stockInsight.recommendedWholesale)}
            </button>
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
  const [isDeletingAll, setIsDeletingAll] = useState(false);
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
    const visibleItems = !needle
      ? items
      : items.filter((item) => [item.sku, item.product_name, item.category, item.depot_location].some((value) => String(value ?? "").toLowerCase().includes(needle)));

    return [...visibleItems].sort((left, right) => {
      const leftInsight = getPriceSuggestion(left);
      const rightInsight = getPriceSuggestion(right);
      if (leftInsight.isLongHeld !== rightInsight.isLongHeld) {
        return leftInsight.isLongHeld ? -1 : 1;
      }
      if (leftInsight.daysHeld !== rightInsight.daysHeld) {
        return rightInsight.daysHeld - leftInsight.daysHeld;
      }
      return String(left.product_name ?? "").localeCompare(String(right.product_name ?? ""));
    });
  }, [items, search]);

  const totals = useMemo(() => {
    const agingCount = items.filter((item) => getPriceSuggestion(item).isLongHeld).length;
    return {
      products: items.length,
      units: items.reduce((total, item) => total + Number(item.quantity ?? 0), 0),
      ready: items.filter((item) => Number(item.quantity ?? 0) > 0).length,
      aging: agingCount,
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

  async function handleDeleteStock(item) {
    const shouldDelete = window.confirm(`Delete ${item.product_name} from My Stock?`);
    if (!shouldDelete) return;

    try {
      await deleteStockItem(item.id);
      setItems((current) => current.filter((stockItem) => stockItem.id !== item.id));
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      queueSnackbar("Stock item deleted.");
    } catch (apiError) {
      queueSnackbar(firstError(apiError), "error");
    }
  }

  async function handleDeleteAllStock() {
    if (!items.length) return;

    const shouldDelete = window.confirm(`Delete all ${items.length} stock items from My Stock?`);
    if (!shouldDelete) return;

    setIsDeletingAll(true);
    try {
      await deleteAllStockItems();
      setItems([]);
      setSelectedItem(null);
      queueSnackbar("All stock items deleted.");
    } catch (apiError) {
      queueSnackbar(firstError(apiError), "error");
    } finally {
      setIsDeletingAll(false);
    }
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
            <button className="stock-danger-button" type="button" disabled={!items.length || isDeletingAll} onClick={handleDeleteAllStock}>
              <Trash2 size={18} />
              {isDeletingAll ? "Deleting..." : "Delete All Stock"}
            </button>
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
          <article>
            <span>Long-Held Stock</span>
            <strong>{totals.aging}</strong>
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
            {filteredItems.map((item) => {
              const insight = getPriceSuggestion(item);

              return (
                <article className={insight.isLongHeld ? "stock-card stock-card--aging" : "stock-card"} key={item.id}>
                  <button className="stock-card__trash" type="button" onClick={() => handleDeleteStock(item)} aria-label={`Delete ${item.product_name}`}>
                    <Trash2 size={18} />
                  </button>
                  <div className="stock-card__top">
                    <div>
                      <span>{item.sku || "No SKU"}</span>
                      <h2>{item.product_name}</h2>
                      <p>{item.category} - {item.condition_label}</p>
                    </div>
                    <Box size={34} />
                  </div>
                  <div className="stock-card__signals">
                    <span className={getAgingClass(insight.daysHeld)}>{getAgingLabel(insight.daysHeld)}</span>
                    <span className="stock-age-meta">Held {insight.daysHeld} days in depot</span>
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
                  {insight.isLongHeld && (
                    <div className="stock-recommendation">
                      <strong>Quick-list recommendation</strong>
                      <span>Retail at ${formatMoney(insight.recommendedRetail)} or wholesale at ${formatMoney(insight.recommendedWholesale)} to move older stock faster.</span>
                    </div>
                  )}
                  <p>{item.description || "No product notes added."}</p>
                  <div className="stock-card__footer">
                    <span>{item.depot_location || "Depot location not set"}</span>
                    <button type="button" disabled={Number(item.quantity) < 1} onClick={() => setSelectedItem(item)}>
                      <Plus size={17} />
                      Create Listing
                    </button>
                  </div>
                </article>
              );
            })}
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
