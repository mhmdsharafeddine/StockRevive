import React, { useEffect, useState } from "react";
import { Bell, Boxes, BriefcaseBusiness, CheckCheck, ClipboardList, LogOut, Settings, Trash2 } from "lucide-react";

import {
  clearAuthSession,
  deleteNotification,
  fetchNotifications,
  getAuthUser,
  logoutAccount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/homepage.js";
import { queueSnackbar } from "../utils/snackbar.js";
import Brand from "./Brand.jsx";
import Button from "./Button.jsx";

const navItems = ["Home", "Retail", "Wholesale", "Insights"];

function formatNotificationTime(value) {
  if (!value) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function NotificationsCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  async function loadNotifications() {
    setIsLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data.results ?? []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function handleToggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen) {
      await loadNotifications();
    }
  }

  async function handleMarkRead(notificationId) {
    try {
      const updated = await markNotificationRead(notificationId);
      setNotifications((items) => items.map((item) => (item.id === notificationId ? updated : item)));
      setUnreadCount((count) => Math.max(count - 1, 0));
    } catch {
      queueSnackbar("Could not update notification.", "error");
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      queueSnackbar("Could not update notifications.", "error");
    }
  }

  async function handleDelete(notification) {
    try {
      await deleteNotification(notification.id);
      setNotifications((items) => items.filter((item) => item.id !== notification.id));
      if (!notification.is_read) {
        setUnreadCount((count) => Math.max(count - 1, 0));
      }
      queueSnackbar("Notification deleted.");
    } catch {
      queueSnackbar("Could not delete notification.", "error");
    }
  }

  return (
    <div className="notifications">
      <button
        className="notifications__button"
        type="button"
        aria-label="Open notifications"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <Bell size={19} />
        {unreadCount > 0 && <span className="notifications__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notifications__panel">
          <div className="notifications__header">
            <div>
              <strong>Notifications</strong>
              <span>{unreadCount} unread</span>
            </div>
            <button type="button" onClick={handleMarkAllRead} disabled={!unreadCount}>
              <CheckCheck size={16} />
              Mark read
            </button>
          </div>

          <div className="notifications__list">
            {isLoading && <p className="notifications__empty">Loading notifications...</p>}
            {!isLoading && notifications.length === 0 && (
              <p className="notifications__empty">No notifications yet.</p>
            )}
            {!isLoading &&
              notifications.map((notification) => (
                <article
                  className={
                    notification.is_read
                      ? "notifications__item"
                      : "notifications__item notifications__item--unread"
                  }
                  key={notification.id}
                >
                  <div>
                    <strong>{notification.title}</strong>
                    <div className="notifications__item-actions">
                      <span>{formatNotificationTime(notification.created_at)}</span>
                      <button
                        className="notifications__delete"
                        type="button"
                        aria-label="Delete notification"
                        onClick={() => handleDelete(notification)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <p>{notification.message}</p>
                  {notification.listing_request && (
                    <small>
                      {notification.listing_request.request_type_label} - {notification.listing_request.product_name}
                    </small>
                  )}
                  {!notification.is_read && (
                    <button type="button" onClick={() => handleMarkRead(notification.id)}>
                      Mark as read
                    </button>
                  )}
                </article>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ activePage = "Home" }) {
  const user = getAuthUser();
  const visibleNavItems = navItems.filter((item) => item !== "Wholesale" || user?.profile?.account_type === "business");

  async function handleLogout() {
    await logoutAccount();
    clearAuthSession();
    queueSnackbar("Logged out successfully.");
    window.location.assign("/");
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Brand />
        <nav className="nav" aria-label="Main navigation">
          {visibleNavItems.map((item) => (
            <a
              className={item === activePage ? "nav__link nav__link--active" : "nav__link"}
              href={item === "Home" ? "/" : `/${item.toLowerCase()}`}
              key={item}
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <NotificationsCenter />
              <a className="my-listings-link" href="/orders">
                <ClipboardList size={17} />
                Orders
              </a>
              {user.profile?.account_type === "business" && (
                <>
                  <a className="my-listings-link" href="/my-stock">
                    <Boxes size={17} />
                    My Stock
                  </a>
                  <a className="my-listings-link" href="/my-listings">
                    <BriefcaseBusiness size={17} />
                    My Listings
                  </a>
                </>
              )}
              <a className="settings-button" href="/settings" aria-label="Account settings">
                <Settings size={19} />
              </a>
              <span className="user-chip">{user.full_name}</span>
              <button className="logout-button" type="button" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </>
          ) : (
            <>
              <a className="login-link" href="/login">Login</a>
              <Button href="/signup">Sign Up</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
