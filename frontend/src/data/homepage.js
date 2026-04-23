import {
  BarChart3,
  Box,
  CircleDot,
  PackageSearch,
  ShoppingCart,
  TrendingUp,
  Zap,
} from "lucide-react";

export const fallbackMetrics = [
  { label: "Active Products", value: "12,458", badge: "+12%" },
  { label: "Partner Stores", value: "247", badge: "+8%" },
  { label: "Daily Searches", value: "8,934", badge: "+23%" },
  { label: "Wholesale Listings", value: "1,260", badge: "Live" },
];

export const platformFeatures = [
  {
    title: "Retail Marketplace",
    description: "Search and compare products across stores with live availability",
    action: "Explore",
    icon: ShoppingCart,
    tone: "cyan",
  },
  {
    title: "Wholesale Marketplace",
    description: "Browse bulk inventory and get shortage alerts for better stock management",
    action: "Explore",
    icon: Box,
    tone: "pink",
  },
  {
    title: "Insights Dashboard",
    description: "View store activity, listings, orders, and inventory status",
    action: "Explore",
    icon: TrendingUp,
    tone: "orange",
  },
];

export const intelligentFeatures = [
  {
    title: "Live Availability",
    description: "See which stores have stock before creating an order",
    icon: Zap,
  },
  {
    title: "Shortage Detection",
    description: "Real-time alerts for products with low store inventory",
    icon: CircleDot,
  },
  {
    title: "Order Tracking",
    description: "Track reservations, delivery requests, and wholesale orders",
    icon: BarChart3,
  },
];

export const steps = [
  {
    number: "1",
    title: "Search Products",
    description: "Find what you need across all partner stores in real-time",
  },
  {
    number: "2",
    title: "Compare Listings",
    description: "Review stores, prices, and stock before ordering",
  },
  {
    number: "3",
    title: "Make Better Decisions",
    description: "Buy at the right time and manage inventory like a pro",
  },
];

export const sampleProducts = [
  {
    id: 1,
    name: "MacBook Air M3",
    category: "Laptops",
    price: "1199.00",
    stock_label: "In stock",
    stock_status: "in_stock",
    store: { name: "TechHub Beirut" },
    icon: PackageSearch,
  },
  {
    id: 2,
    name: "Sony WH-1000XM5",
    category: "Headphones",
    price: "349.00",
    stock_label: "Low stock",
    stock_status: "low_stock",
    store: { name: "Circuit City" },
    icon: PackageSearch,
  },
  {
    id: 3,
    name: "Samsung Galaxy S25",
    category: "Phones",
    price: "899.00",
    stock_label: "In stock",
    stock_status: "in_stock",
    store: { name: "Gadget Zone" },
    icon: PackageSearch,
  },
];
