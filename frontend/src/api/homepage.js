const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health/`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchHomepageData() {
  const response = await fetch(`${API_BASE_URL}/homepage/`);

  if (!response.ok) {
    throw new Error("Unable to load homepage data");
  }

  return response.json();
}

export async function fetchProducts({ search = "", category = "All Categories" } = {}) {
  const params = new URLSearchParams();

  if (search) params.set("search", search);
  if (category && category !== "All Categories") params.set("category", category);

  const response = await fetch(`${API_BASE_URL}/products/${params.toString() ? `?${params}` : ""}`);

  if (!response.ok) {
    throw new Error("Unable to load products");
  }

  return response.json();
}

export async function createProductListing(formData) {
  const token = getStoredToken();
  const headers = token ? { Authorization: `Token ${token}` } : {};
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/products/`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch {
    throw { detail: "Backend is offline. Start the Django server and try again." };
  }

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export async function updateProductListing(productId, formData) {
  const token = getStoredToken();
  const headers = token ? { Authorization: `Token ${token}` } : {};
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/products/${productId}/`, {
      method: "PATCH",
      headers,
      body: formData,
    });
  } catch {
    throw { detail: "Backend is offline. Start the Django server and try again." };
  }

  const data = await response.json();

  if (!response.ok) {
    throw data;
  }

  return data;
}

export function deleteProductListing(productId) {
  return authedJsonRequest(`/products/${productId}/`, {
    method: "DELETE",
  });
}

export async function fetchProductDeals(productId) {
  const response = await fetch(`${API_BASE_URL}/products/${productId}/deals/`);

  if (!response.ok) {
    throw new Error("Unable to load product deals");
  }

  return response.json();
}

async function authRequest(path, payload) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/${path}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw {
      code: "backend_offline",
      detail: "Backend is offline. Start the Django server and try again.",
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : { detail: await response.text() };

  if (!response.ok) {
    throw data;
  }

  return data;
}

export function getStoredToken() {
  return localStorage.getItem("stockrevive_token") ?? sessionStorage.getItem("stockrevive_token");
}

async function authedJsonRequest(path, options = {}) {
  const token = getStoredToken();

  if (!token) {
    throw { code: "not_authenticated", detail: "Log in first." };
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw {
      code: "backend_offline",
      detail: "Backend is offline. Start the Django server and try again.",
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : { detail: await response.text() };

  if (!response.ok) {
    throw data;
  }

  return data;
}

export function createListingRequest(productId, requestType) {
  return authedJsonRequest(`/products/${productId}/request/`, {
    method: "POST",
    body: JSON.stringify({ request_type: requestType }),
  });
}

export function fetchNotifications() {
  return authedJsonRequest("/notifications/");
}

export function markNotificationRead(notificationId) {
  return authedJsonRequest(`/notifications/${notificationId}/read/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function markAllNotificationsRead() {
  return authedJsonRequest("/notifications/read-all/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function deleteNotification(notificationId) {
  return authedJsonRequest(`/notifications/${notificationId}/`, {
    method: "DELETE",
  });
}

export function fetchMyListings() {
  return authedJsonRequest("/my-listings/");
}

export function fetchStockItems() {
  return authedJsonRequest("/stock/");
}

export async function uploadStockSheet(formData) {
  const token = getStoredToken();
  if (!token) {
    throw { code: "not_authenticated", detail: "Log in first." };
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/stock/upload/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
      },
      body: formData,
    });
  } catch {
    throw {
      code: "backend_offline",
      detail: "Backend is offline. Start the Django server and try again.",
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : { detail: await response.text() };

  if (!response.ok) {
    throw data;
  }

  return data;
}

export function createListingFromStock(stockItemId, payload) {
  return authedJsonRequest(`/stock/${stockItemId}/list/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteStockItem(stockItemId) {
  return authedJsonRequest(`/stock/${stockItemId}/`, {
    method: "DELETE",
  });
}

export function deleteAllStockItems() {
  return authedJsonRequest("/stock/delete-all/", {
    method: "DELETE",
  });
}

export function fetchOrders() {
  return authedJsonRequest("/orders/");
}

export function fetchOrderDetail(orderId) {
  return authedJsonRequest(`/orders/${orderId}/`);
}

export function completeOrder(orderId) {
  return authedJsonRequest(`/orders/${orderId}/complete/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function cancelOrder(orderId) {
  return authedJsonRequest(`/orders/${orderId}/cancel/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function deleteOrder(orderId) {
  return authedJsonRequest(`/orders/${orderId}/delete/`, {
    method: "DELETE",
  });
}

export function fetchWholesaleListings({ search = "", category = "All Listings" } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category && category !== "All Listings") params.set("category", category);
  return authedJsonRequest(`/wholesale/listings/${params.toString() ? `?${params}` : ""}`);
}

export function createWholesaleListing(payload) {
  return authedJsonRequest("/wholesale/listings/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWholesaleListing(listingId, payload) {
  return authedJsonRequest(`/wholesale/listings/${listingId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteWholesaleListing(listingId) {
  return authedJsonRequest(`/wholesale/listings/${listingId}/`, {
    method: "DELETE",
  });
}

export function createWholesaleOrder(listingId, payload) {
  return authedJsonRequest(`/wholesale/listings/${listingId}/order/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchWholesaleOrderDetail(orderId) {
  return authedJsonRequest(`/wholesale/orders/${orderId}/`);
}

export function completeWholesaleOrder(orderId) {
  return authedJsonRequest(`/wholesale/orders/${orderId}/complete/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function cancelWholesaleOrder(orderId) {
  return authedJsonRequest(`/wholesale/orders/${orderId}/cancel/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function deleteWholesaleOrder(orderId) {
  return authedJsonRequest(`/wholesale/orders/${orderId}/delete/`, {
    method: "DELETE",
  });
}

export function updateAccountSettings(payload) {
  return authedJsonRequest("/auth/settings/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function registerAccount(payload) {
  return authRequest("register", payload);
}

export function loginAccount(payload) {
  return authRequest("login", payload);
}

export async function logoutAccount() {
  const token = getStoredToken();

  if (!token) {
    return { message: "Logged out." };
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
      },
    });
  } catch {
    clearAuthSession();
    return { message: "Logged out locally." };
  }

  clearAuthSession();

  if (!response.ok) {
    return { message: "Logged out locally." };
  }

  return response.json();
}

export function saveAuthSession(data, remember = true) {
  clearAuthSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("stockrevive_token", data.token);
  storage.setItem("stockrevive_user", JSON.stringify(data.user));
}

export function updateStoredUser(user) {
  const storage = localStorage.getItem("stockrevive_token") ? localStorage : sessionStorage;
  storage.setItem("stockrevive_user", JSON.stringify(user));
}

export function getAuthUser() {
  const storedUser = localStorage.getItem("stockrevive_user") ?? sessionStorage.getItem("stockrevive_user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    clearAuthSession();
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem("stockrevive_token");
  localStorage.removeItem("stockrevive_user");
  sessionStorage.removeItem("stockrevive_token");
  sessionStorage.removeItem("stockrevive_user");
}
