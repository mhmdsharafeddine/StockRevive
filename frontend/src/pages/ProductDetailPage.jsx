import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Box, MapPin, Navigation, PackageCheck, Phone, ShieldCheck, Store, Truck } from "lucide-react";

import { createListingRequest, fetchProductDeals, getAuthUser } from "../api/homepage.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import { queueSnackbar } from "../utils/snackbar.js";
import { showSnackbar } from "../utils/snackbar.js";

function formatPrice(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function ProductDetailPage({ productId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  useEffect(() => {
    fetchProductDeals(productId)
      .then(setData)
      .catch(() => setError("Unable to load product deals."));
  }, [productId]);

  const product = data?.product;
  const offers = data?.offers ?? [];
  const lowestPrice = data?.stats?.lowest_price ?? product?.price;
  const image = product?.photo_url || product?.image || product?.image_url;

  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => Number(a.price) - Number(b.price));
  }, [offers]);

  async function sendStoreRequest(requestType, offer) {
    const user = getAuthUser();

    if (!user) {
      queueSnackbar("Log in to reserve products or request delivery.", "error");
      window.location.assign("/login");
      return;
    }

    const actionKey = `${offer.id}-${requestType}`;
    setPendingAction(actionKey);

    try {
      const result = await createListingRequest(offer.id, requestType);
      const storeName = offer.store?.name ?? offer.seller_name ?? "the store";
      const fallback = result.notified
        ? `${result.message} ${storeName} has been notified.`
        : `${result.message} We saved it, but this listing has no store account to notify.`;
      setData((current) => {
        if (!current) return current;

        return {
          ...current,
          stats: {
            ...current.stats,
            total_quantity: Math.max(Number(current.stats?.total_quantity ?? 1) - 1, 0),
          },
          product:
            current.product?.id === offer.id
              ? {
                  ...current.product,
                  quantity: Math.max(Number(current.product.quantity ?? 1) - 1, 0),
                }
              : current.product,
          offers: current.offers.map((item) => {
            if (item.id !== offer.id) return item;
            const nextQuantity = Math.max(Number(item.quantity ?? 1) - 1, 0);
            return {
              ...item,
              quantity: nextQuantity,
              stock_label: nextQuantity === 0 ? "Out of stock" : nextQuantity <= 2 ? "Low stock" : "In stock",
              stock_status: nextQuantity === 0 ? "out_of_stock" : nextQuantity <= 2 ? "low_stock" : "in_stock",
            };
          }),
        };
      });
      showSnackbar(result.message ? fallback : `Request sent to ${storeName}.`);
    } catch (requestError) {
      showSnackbar(requestError.detail ?? "Unable to send the request right now.", "error");
    } finally {
      setPendingAction("");
    }
  }

  function notifyDirections(offer) {
    showSnackbar(`Directions opened for ${offer.store?.name ?? offer.seller_name}.`);
  }

  return (
    <>
      <Header activePage="Retail" />
      <main className="product-detail-page">
        <a className="back-link" href="/retail">
          <ArrowLeft size={18} />
          Back to Retail Marketplace
        </a>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        {product && (
          <>
            <section className="product-detail-layout">
              <article className="product-summary-card">
                <div className="product-summary-card__media">
                  {image ? <img src={image} alt={product.name} /> : <Box size={78} />}
                </div>
                <div>
                  <span className="product-category-pill">{product.category}</span>
                  <h1>{product.name}</h1>
                  <p>{product.description || `${product.condition_label ?? "New"} computer part available from multiple stores.`}</p>
                  <div className="product-summary-card__meta">
                    <span>
                      <PackageCheck size={18} />
                      Available at <strong>{offers.length} stores</strong>
                    </span>
                    <span>
                      <ShieldCheck size={18} />
                      {data?.stats?.total_quantity ?? product.quantity} total available
                    </span>
                  </div>
                  <div className="product-summary-card__price">
                    <strong>${formatPrice(lowestPrice)}</strong>
                    <span>lowest price</span>
                  </div>
                </div>
              </article>

              <aside className="product-quick-card">
                <h2>Marketplace Summary</h2>
                <div>
                  <span>Lowest price</span>
                  <strong>${formatPrice(lowestPrice)}</strong>
                </div>
                <div>
                  <span>Stores listing it</span>
                  <strong>{offers.length}</strong>
                </div>
                <div>
                  <span>Total stock</span>
                  <strong>{data?.stats?.total_quantity ?? product.quantity}</strong>
                </div>
              </aside>
            </section>

            <section className="store-offers-section">
              <h2>Available at These Stores</h2>
              <div className="store-offers-list">
                {sortedOffers.map((offer, index) => (
                  <article className="store-offer-card" key={offer.id}>
                    <div className="store-offer-card__info">
                      <div className="store-offer-card__title">
                        <Store size={24} />
                        <h3>{offer.store?.name ?? offer.seller_name ?? "Independent Seller"}</h3>
                        {index === 0 && <span>Best Price</span>}
                      </div>
                      <p>
                        <MapPin size={16} />
                        {offer.store?.city ?? "Beirut"}
                      </p>
                      <div className="store-offer-card__badges">
                        <span>
                          <Truck size={15} />
                          Delivery Available
                        </span>
                        <span>
                          <PackageCheck size={15} />
                          {offer.quantity} in stock
                        </span>
                        <span>{offer.condition_label}</span>
                      </div>
                      {offer.seller_phone && (
                        <p>
                          <Phone size={16} />
                          {offer.seller_phone}
                        </p>
                      )}
                    </div>
                    <div className="store-offer-card__actions">
                      <strong>${formatPrice(offer.price)}</strong>
                      <button
                        type="button"
                        disabled={pendingAction === `${offer.id}-reservation` || Number(offer.quantity) < 1}
                        onClick={() => sendStoreRequest("reservation", offer)}
                      >
                        {Number(offer.quantity) < 1
                          ? "Out of Stock"
                          : pendingAction === `${offer.id}-reservation`
                            ? "Sending..."
                            : "Reserve Now"}
                      </button>
                      <button
                        type="button"
                        disabled={pendingAction === `${offer.id}-delivery` || Number(offer.quantity) < 1}
                        onClick={() => sendStoreRequest("delivery", offer)}
                      >
                        {Number(offer.quantity) < 1
                          ? "Out of Stock"
                          : pendingAction === `${offer.id}-delivery`
                            ? "Sending..."
                            : "Request Delivery"}
                      </button>
                      <button type="button" aria-label="Directions" onClick={() => notifyDirections(offer)}>
                        <Navigation size={18} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
