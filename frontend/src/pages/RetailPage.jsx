import React, { useEffect, useMemo, useState } from "react";
import {
  Cpu,
  Filter,
  Grid3X3,
  HardDrive,
  LayoutList,
  MapPin,
  MemoryStick,
  Microchip,
  Monitor,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";

import { createProductListing, fetchProducts, getAuthUser } from "../api/homepage.js";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import { showSnackbar } from "../utils/snackbar.js";

const categories = [
  "All Categories",
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

const categoryIcons = {
  CPUs: Cpu,
  GPUs: Microchip,
  Motherboards: Microchip,
  RAM: MemoryStick,
  Storage: HardDrive,
  "Power Supplies": Cpu,
  Cooling: Cpu,
  Cases: Cpu,
  Monitors: Monitor,
  Peripherals: Cpu,
};

const fallbackProducts = [
  {
    id: "demo-1",
    name: "AMD Ryzen 7 7800X3D",
    category: "CPUs",
    price: "349.00",
    quantity: 4,
    condition_label: "New",
    stock_label: "In stock",
    seller_name: "TechHub Beirut",
    seller_phone: "+961 70 000 000",
    store: { name: "TechHub Beirut", city: "Beirut" },
  },
  {
    id: "demo-2",
    name: "NVIDIA RTX 4070 Super",
    category: "GPUs",
    price: "599.00",
    quantity: 2,
    condition_label: "Open box",
    stock_label: "Low stock",
    seller_name: "PC Garage",
    store: { name: "PC Garage", city: "Jounieh" },
  },
  {
    id: "demo-3",
    name: "Samsung 990 Pro 2TB NVMe",
    category: "Storage",
    price: "169.00",
    quantity: 9,
    condition_label: "New",
    stock_label: "In stock",
    seller_name: "Circuit City",
    store: { name: "Circuit City", city: "Byblos" },
  },
];

function formatPrice(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function firstError(error) {
  if (!error || typeof error !== "object") return "Unable to create listing.";
  const value = error.name ?? error.price ?? error.category ?? error.quantity ?? error.condition ?? error.image ?? error.detail ?? error.non_field_errors;
  return Array.isArray(value) ? value[0] : value ?? "Unable to create listing.";
}

function groupRetailProducts(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const grouped = new Map();

  items.forEach((product) => {
    const key = `${product.name}::${product.category}`;
    const current = grouped.get(key);
    const quantity = Number(product.quantity ?? 0);
    const price = Number(product.price ?? 0);

    if (!current) {
      grouped.set(key, {
        ...product,
        lowest_price: price,
        total_quantity: quantity,
        store_count: 1,
      });
      return;
    }

    grouped.set(key, {
      ...current,
      id: current.id,
      photo_url: current.photo_url || product.photo_url,
      image: current.image || product.image,
      image_url: current.image_url || product.image_url,
      lowest_price: Math.min(Number(current.lowest_price ?? price), price),
      total_quantity: Number(current.total_quantity ?? 0) + quantity,
      store_count: Number(current.store_count ?? 1) + 1,
      quantity: Number(current.total_quantity ?? 0) + quantity,
      stock_status:
        Number(current.total_quantity ?? 0) + quantity < 1
          ? "out_of_stock"
          : Number(current.total_quantity ?? 0) + quantity <= 2
            ? "low_stock"
            : "in_stock",
      stock_label:
        Number(current.total_quantity ?? 0) + quantity < 1
          ? "Out of stock"
          : Number(current.total_quantity ?? 0) + quantity <= 2
            ? "Low stock"
            : "In stock",
    });
  });

  return [...grouped.values()];
}

function CustomSelect({ label, name, options, value, onChange, required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  function choose(option) {
    onChange({ target: { name, value: option.value } });
    setIsOpen(false);
  }

  return (
    <div className="custom-select">
      <span>
        {label}
        {required && " *"}
      </span>
      <button type="button" onClick={() => setIsOpen((current) => !current)} aria-expanded={isOpen}>
        {selected.label}
      </button>
      {isOpen && (
        <div className="custom-select__menu">
          {options.map((option) => (
            <button className={option.value === value ? "custom-select__option custom-select__option--active" : "custom-select__option"} key={option.value} type="button" onClick={() => choose(option)}>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductListingCard({ product, view }) {
  const image = product.photo_url || product.image || product.image_url;
  const Icon = categoryIcons[product.category] ?? Cpu;
  const statusClass =
    product.stock_status === "out_of_stock" || Number(product.quantity ?? 1) < 1
      ? "retail-card__status retail-card__status--out"
      : product.stock_status === "low_stock"
        ? "retail-card__status retail-card__status--worth_waiting"
        : "retail-card__status retail-card__status--buy_now";

  return (
    <a className={view === "list" ? "retail-card retail-card--list" : "retail-card"} href={`/retail/product/${product.id}`}>
      <div className="retail-card__media">
        {image ? <img src={image} alt={product.name} /> : <Icon size={52} />}
      </div>
      <span className={statusClass}>
        {product.stock_label ?? "In stock"}
      </span>
      <div className="retail-card__body">
        <h3>{product.name}</h3>
        <p>{product.category}</p>
        <div className="retail-card__price">
          <strong>${formatPrice(product.lowest_price ?? product.price)}</strong>
          <span>from {product.store_count ?? 1} store{Number(product.store_count ?? 1) === 1 ? "" : "s"}</span>
        </div>
        <div className="retail-card__meta">
          <span>
            <MapPin size={15} />
            {(product.store_count ?? 1) > 1 ? "Multiple stores" : product.store?.city ?? "Beirut"}
          </span>
          <strong>{product.total_quantity ?? product.quantity ?? 1} available</strong>
        </div>
        <div className="retail-card__seller">
          <span>
            {(product.store_count ?? 1) > 1
              ? `Compare ${product.store_count} store listings`
              : product.seller_name || product.store?.name || "Independent Seller"}
          </span>
          {(product.store_count ?? 1) > 1 ? <small>Open product details to review each store offer</small> : product.seller_phone && <small>{product.seller_phone}</small>}
        </div>
      </div>
    </a>
  );
}

function ListingModal({ onClose, onCreated }) {
  const user = getAuthUser();
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "CPUs",
    price: "",
    quantity: "1",
    condition: "new",
    stock_status: "in_stock",
    store_city: "Beirut",
    description: "",
    image: null,
  });

  function updateField(event) {
    const { files, name, value } = event.target;

    if (name === "image") {
      const file = files?.[0] ?? null;
      setForm((current) => ({ ...current, image: file }));
      setPreview(file ? URL.createObjectURL(file) : "");
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const payload = new FormData();
    Object.entries({
      ...form,
      wait_status: "buy_now",
      rating: "4.8",
      distance_miles: "1.0",
      store_count: "1",
    }).forEach(([key, value]) => {
      if (value !== null && value !== "") {
        payload.append(key, value);
      }
    });

    try {
      const product = await createProductListing(payload);
      showSnackbar("Listing created successfully.");
      onCreated(product);
      onClose();
    } catch (apiError) {
      setError(firstError(apiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="listing-modal-title">
      <div className="listing-modal__panel">
        <button className="listing-modal__close" type="button" onClick={onClose} aria-label="Close listing form">
          <X size={20} />
        </button>
        <div className="listing-modal__header">
          <h2 id="listing-modal-title">Create Marketplace Listing</h2>
          <p>
            Listing as <strong>{user?.profile?.store_name ?? "your store"}</strong>. Your store identity is attached automatically.
          </p>
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
              <input name="name" onChange={updateField} placeholder="RTX 4070 Super" required value={form.name} />
            </label>
            <CustomSelect
              label="Category"
              name="category"
              onChange={updateField}
              options={categories.slice(1).map((category) => ({ label: category, value: category }))}
              required
              value={form.category}
            />
            <label>
              Price *
              <input min="0" name="price" onChange={updateField} placeholder="599" required step="0.01" type="number" value={form.price} />
            </label>
            <label>
              Quantity available *
              <input min="1" name="quantity" onChange={updateField} required type="number" value={form.quantity} />
            </label>
            <CustomSelect
              label="Condition"
              name="condition"
              onChange={updateField}
              options={[
                { label: "New", value: "new" },
                { label: "Open box", value: "open_box" },
                { label: "Used", value: "used" },
                { label: "Refurbished", value: "refurbished" },
              ]}
              required
              value={form.condition}
            />
            <CustomSelect
              label="Stock status"
              name="stock_status"
              onChange={updateField}
              options={[
                { label: "In stock", value: "in_stock" },
                { label: "Low stock", value: "low_stock" },
                { label: "Out of stock", value: "out_of_stock" },
              ]}
              required
              value={form.stock_status}
            />
            <label>
              City
              <input name="store_city" onChange={updateField} placeholder="Beirut" value={form.store_city} />
            </label>
            <label className="listing-form__full">
              Description
              <textarea name="description" onChange={updateField} placeholder="Mention compatibility, warranty, box contents, and any notes." value={form.description} />
            </label>
          </div>
          <button className="auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating listing..." : "Create Listing"}
            <Plus size={19} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RetailPage() {
  const user = getAuthUser();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [view, setView] = useState("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts()
      .then((items) => setProducts(items.length ? items : fallbackProducts))
      .catch(() => setProducts(fallbackProducts));
  }, []);

  const groupedProducts = useMemo(() => groupRetailProducts(products), [products]);

  const filteredProducts = useMemo(() => {
    return groupedProducts.filter((product) => {
      const matchesCategory = category === "All Categories" || product.category === category;
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, groupedProducts, search]);

  function handleCreated(product) {
    setProducts((current) => [product, ...current]);
  }

  function handleOpenListingModal() {
    if (!user) {
      showSnackbar("Log in with a business account to create a listing.", "error");
      window.location.assign("/login");
      return;
    }

    if (user.profile?.account_type !== "business") {
      showSnackbar("Only business accounts can create marketplace listings.", "error");
      return;
    }

    setIsModalOpen(true);
  }

  return (
    <>
      <Header activePage="Retail" />
      <main className="retail-page">
        <section className="retail-hero">
          <div>
            <h1>Retail Marketplace</h1>
            <p>Buy and sell computer parts from local stores and sellers</p>
          </div>
          <button className="retail-create-button" type="button" onClick={handleOpenListingModal}>
            <Plus size={19} />
            Create Listing
          </button>
        </section>

        <section className="retail-tools">
          <div className="retail-search">
            <Search size={22} />
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Search CPUs, GPUs, RAM, storage..." value={search} />
          </div>
          <button className="retail-tool-button" type="button">
            <Filter size={20} />
            Filters
          </button>
          <button className={view === "grid" ? "retail-icon-button retail-icon-button--active" : "retail-icon-button"} type="button" onClick={() => setView("grid")} aria-label="Grid view">
            <Grid3X3 size={20} />
          </button>
          <button className={view === "list" ? "retail-icon-button retail-icon-button--active" : "retail-icon-button"} type="button" onClick={() => setView("list")} aria-label="List view">
            <LayoutList size={20} />
          </button>
          <div className="retail-categories">
            {categories.map((item) => (
              <button className={item === category ? "retail-category retail-category--active" : "retail-category"} key={item} type="button" onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className={view === "list" ? "retail-grid retail-grid--list" : "retail-grid"}>
          {filteredProducts.map((product) => (
            <ProductListingCard product={product} view={view} key={product.id} />
          ))}
        </section>
      </main>
      <Footer />
      {isModalOpen && <ListingModal onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />}
    </>
  );
}
