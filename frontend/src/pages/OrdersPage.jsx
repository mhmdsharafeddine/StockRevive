import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MapPin, PackageCheck, ReceiptText, Store, Truck, UserRound, Trash2, XCircle } from "lucide-react";
import {
  cancelOrder,
  cancelWholesaleOrder,
  completeOrder,
  completeWholesaleOrder,
  deleteOrder,
  deleteWholesaleOrder,
  fetchOrderDetail,
  fetchOrders,
  fetchWholesaleOrderDetail,
  getAuthUser,
} from "../api/homepage.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import { queueSnackbar } from "../utils/snackbar.js";
import { showSnackbar } from "../utils/snackbar.js";

function formatPrice(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function orderTitle(order) {
  return `${order.request_type_label} - ${order.product_name}`;
}

function normalizeOrders(items = [], marketplace = "retail") {
  return items.map((item) => ({
    ...item,
    marketplace,
    order_key: item.order_key ?? `${marketplace}-${item.id}`,
  }));
}

function addressLine(party) {
  return [party?.street_address, party?.building_details, party?.city].filter(Boolean).join(", ") || "Address not set";
}

function isFinalOrder(order) {
  return order.status === "completed" || order.status === "canceled";
}

function statusClass(order) {
  if (order.status === "completed") return "order-row__status order-row__status--completed";
  if (order.status === "canceled") return "order-row__status order-row__status--canceled";
  return "order-row__status";
}

function OrderList({ title, orders, selectedId, onSelect, onDelete, emptyText, deletingId }) {
  return (
    <section className="orders-list-panel">
      <h2>{title}</h2>
      {orders.length === 0 ? (
        <p className="orders-empty-text">{emptyText}</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div className="order-row-shell" key={`${title}-${order.id}`}>
              <button
                className={order.order_key === selectedId ? "order-row order-row--active" : "order-row"}
                type="button"
                onClick={() => onSelect(order)}
              >
                <span className={statusClass(order)}>{order.status_label}</span>
                <strong>{orderTitle(order)}</strong>
                <small>{title === "Orders From You" ? order.seller.name : order.buyer.name}</small>
                <span>${formatPrice(order.total)}</span>
              </button>
              <button
                className="order-row-delete"
                disabled={!isFinalOrder(order) || deletingId === order.order_key}
                type="button"
                title={isFinalOrder(order) ? "Delete order" : "Only completed or canceled orders can be deleted"}
                onClick={() => onDelete(order)}
                aria-label="Delete order"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function OrdersPage() {
  const user = getAuthUser();
  const [orders, setOrders] = useState({ buying: [], selling: [] });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      queueSnackbar("Log in to view your orders.", "error");
      window.location.assign("/login");
      return;
    }

    fetchOrders()
      .then((data) => {
        const nextOrders = {
          buying: [
            ...normalizeOrders(data.buying, "retail"),
            ...normalizeOrders(data.wholesale_buying, "wholesale"),
          ],
          selling: [
            ...normalizeOrders(data.selling, "retail"),
            ...normalizeOrders(data.wholesale_selling, "wholesale"),
          ],
        };
        setOrders(nextOrders);
        setSelectedOrder(nextOrders.selling[0] ?? nextOrders.buying[0] ?? null);
      })
      .catch(() => setError("Unable to load orders."))
      .finally(() => setIsLoading(false));
  }, []);

  const selectedRole = useMemo(() => {
    if (!selectedOrder) return "";
    return selectedOrder.seller?.email === user?.email ? "seller" : "buyer";
  }, [selectedOrder, user]);

  async function handleSelect(order) {
    setSelectedOrder(order);
    try {
      const details = order.marketplace === "wholesale" ? await fetchWholesaleOrderDetail(order.id) : await fetchOrderDetail(order.id);
      setSelectedOrder({ ...details, marketplace: order.marketplace, order_key: order.order_key });
    } catch {
      showSnackbar("Could not load full order details.", "error");
    }
  }

  async function handleComplete() {
    if (!selectedOrder) return;

    setIsCompleting(true);
    try {
      const updated =
        selectedOrder.marketplace === "wholesale"
          ? await completeWholesaleOrder(selectedOrder.id)
          : await completeOrder(selectedOrder.id);
      const normalized = { ...updated, marketplace: selectedOrder.marketplace, order_key: selectedOrder.order_key };
      setSelectedOrder(normalized);
      setOrders((current) => ({
        buying: current.buying.map((order) => (order.order_key === normalized.order_key ? normalized : order)),
        selling: current.selling.map((order) => (order.order_key === normalized.order_key ? normalized : order)),
      }));
      showSnackbar("Order marked as completed.");
    } catch (completeError) {
      showSnackbar(completeError.detail ?? "Could not complete the order.", "error");
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleCancel() {
    if (!selectedOrder) return;

    setIsCanceling(true);
    try {
      const updated =
        selectedOrder.marketplace === "wholesale"
          ? await cancelWholesaleOrder(selectedOrder.id)
          : await cancelOrder(selectedOrder.id);
      const normalized = { ...updated, marketplace: selectedOrder.marketplace, order_key: selectedOrder.order_key };
      setSelectedOrder(normalized);
      setOrders((current) => ({
        buying: current.buying.map((order) => (order.order_key === normalized.order_key ? normalized : order)),
        selling: current.selling.map((order) => (order.order_key === normalized.order_key ? normalized : order)),
      }));
      showSnackbar("Order canceled.");
    } catch (cancelError) {
      showSnackbar(cancelError.detail ?? "Could not cancel the order.", "error");
    } finally {
      setIsCanceling(false);
    }
  }

  async function handleDelete(order) {
    if (!isFinalOrder(order)) {
      showSnackbar("Only completed or canceled orders can be deleted.", "error");
      return;
    }

    setDeletingId(order.order_key);
    try {
      if (order.marketplace === "wholesale") {
        await deleteWholesaleOrder(order.id);
      } else {
        await deleteOrder(order.id);
      }
      setOrders((current) => {
        const nextOrders = {
          buying: current.buying.filter((item) => item.order_key !== order.order_key),
          selling: current.selling.filter((item) => item.order_key !== order.order_key),
        };
        if (selectedOrder?.order_key === order.order_key) {
          setSelectedOrder(nextOrders.selling[0] ?? nextOrders.buying[0] ?? null);
        }
        return nextOrders;
      });
      showSnackbar("Order deleted.");
    } catch (deleteError) {
      showSnackbar(deleteError.detail ?? "Could not delete the order.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Header activePage="Retail" />
      <main className="orders-page">
        <section className="orders-hero">
          <span>Marketplace orders</span>
          <h1>Orders</h1>
          <p>Track the reservations and delivery requests you placed, plus the orders customers sent to your store.</p>
        </section>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}
        {isLoading && <div className="orders-empty-state">Loading orders...</div>}

        {!isLoading && (
          <section className="orders-layout">
            <div className="orders-lists">
              <OrderList
                title="Orders From You"
                orders={orders.buying}
                selectedId={selectedOrder?.order_key}
                onSelect={handleSelect}
                onDelete={handleDelete}
                deletingId={deletingId}
                emptyText="You have not placed any reservations or delivery requests yet."
              />
              <OrderList
                title="Orders To Your Store"
                orders={orders.selling}
                selectedId={selectedOrder?.order_key}
                onSelect={handleSelect}
                onDelete={handleDelete}
                deletingId={deletingId}
                emptyText="No customers have ordered from you yet."
              />
            </div>

            <aside className="order-detail-panel">
              {!selectedOrder ? (
                <div className="orders-empty-state">Select an order to see its details.</div>
              ) : (
                <>
                  <div className="order-detail-panel__header">
                    <span className={selectedOrder.status === "completed" ? "order-status-pill order-status-pill--completed" : selectedOrder.status === "canceled" ? "order-status-pill order-status-pill--canceled" : "order-status-pill"}>
                      {selectedOrder.status_label}
                    </span>
                    <h2>{orderTitle(selectedOrder)}</h2>
                    <p>Created {formatDate(selectedOrder.created_at)}</p>
                    {selectedOrder.completed_at && <p>Fulfilled {formatDate(selectedOrder.completed_at)}</p>}
                  </div>

                  <div className="order-detail-grid">
                    <article>
                      <UserRound size={22} />
                      <h3>Buyer</h3>
                      <strong>{selectedOrder.buyer.name}</strong>
                      <span>{selectedOrder.buyer.email}</span>
                      <span>{selectedOrder.buyer.phone || "No phone set"}</span>
                      <p>
                        <MapPin size={16} />
                        {addressLine(selectedOrder.buyer)}
                      </p>
                    </article>
                    <article>
                      <Store size={22} />
                      <h3>Seller</h3>
                      <strong>{selectedOrder.seller.name}</strong>
                      <span>{selectedOrder.seller.email}</span>
                      <span>{selectedOrder.seller.phone || "No phone set"}</span>
                      <p>
                        <MapPin size={16} />
                        {addressLine(selectedOrder.seller)}
                      </p>
                    </article>
                  </div>

                  <div className="order-product-summary">
                    <div>
                      {selectedOrder.request_type === "delivery" ? <Truck size={22} /> : <PackageCheck size={22} />}
                      <strong>{selectedOrder.marketplace === "wholesale" ? `Wholesale ${selectedOrder.request_type_label}` : selectedOrder.request_type_label}</strong>
                    </div>
                    <span>{selectedOrder.product.condition_label ?? selectedOrder.product.category}</span>
                    <span>
                      {selectedOrder.marketplace === "wholesale"
                        ? `${selectedOrder.quantity} units requested`
                        : `${selectedOrder.product.quantity} listed in stock`}
                    </span>
                  </div>

                  <div className="order-cost-card">
                    <div>
                      <ReceiptText size={22} />
                      <h3>Cost Breakdown</h3>
                    </div>
                    <p>
                      <span>Product price</span>
                      <strong>${formatPrice(selectedOrder.subtotal)}</strong>
                    </p>
                    <p>
                      <span>StockMarket Transaction Fee (13%)</span>
                      <strong>${formatPrice(selectedOrder.transaction_fee)}</strong>
                    </p>
                    <p>
                      <span>Total</span>
                      <strong>${formatPrice(selectedOrder.total)}</strong>
                    </p>
                  </div>

                  <div className="order-action-row">
                    {selectedRole === "seller" && !isFinalOrder(selectedOrder) && (
                      <button className="order-complete-button" disabled={isCompleting} type="button" onClick={handleComplete}>
                        <CheckCircle2 size={19} />
                        {isCompleting ? "Completing..." : "Mark Completed"}
                      </button>
                    )}
                    {!isFinalOrder(selectedOrder) && (
                      <button className="order-cancel-button" disabled={isCanceling} type="button" onClick={handleCancel}>
                        <XCircle size={19} />
                        {isCanceling ? "Canceling..." : "Cancel Order"}
                      </button>
                    )}
                    {isFinalOrder(selectedOrder) && (
                      <button
                        className="order-delete-button"
                        disabled={deletingId === selectedOrder.order_key}
                        type="button"
                        title="Delete order"
                        onClick={() => handleDelete(selectedOrder)}
                      >
                        <Trash2 size={18} />
                        {deletingId === selectedOrder.order_key ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </div>
                  {selectedOrder.status === "completed" && (
                    <div className="order-completed-note">
                      <CheckCircle2 size={18} />
                      This order is fulfilled.
                    </div>
                  )}
                  {selectedOrder.status === "canceled" && (
                    <div className="order-canceled-note">
                      <XCircle size={18} />
                      This order is canceled.
                    </div>
                  )}
                </>
              )}
            </aside>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
