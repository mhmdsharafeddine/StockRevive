import React, { useEffect, useMemo, useState } from "react";

import { fetchHomepageData } from "./api/homepage.js";
import CtaSection from "./components/CtaSection.jsx";
import FeaturesSection from "./components/FeaturesSection.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import HowItWorks from "./components/HowItWorks.jsx";
import IntelligentSection from "./components/IntelligentSection.jsx";
import ProductPreview from "./components/ProductPreview.jsx";
import ScrollReveal from "./components/ScrollReveal.jsx";
import Snackbar from "./components/Snackbar.jsx";
import StatsSection from "./components/StatsSection.jsx";
import {
  fallbackMetrics,
  intelligentFeatures,
  platformFeatures,
  sampleProducts,
  steps,
} from "./data/homepage.js";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import RetailPage from "./pages/RetailPage.jsx";
import ProductDetailPage from "./pages/ProductDetailPage.jsx";
import MyListingsPage from "./pages/MyListingsPage.jsx";
import MyStockPage from "./pages/MyStockPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import WholesalePage from "./pages/WholesalePage.jsx";
import InsightsPage from "./pages/InsightsPage.jsx";

function HomePage({ toast, onCloseToast }) {
  const [homepageData, setHomepageData] = useState(null);

  useEffect(() => {
    fetchHomepageData()
      .then(setHomepageData)
      .catch(() => setHomepageData(null));
  }, []);

  const products = useMemo(() => {
    const apiProducts = homepageData?.products?.trending ?? [];
    return apiProducts.length ? apiProducts : sampleProducts;
  }, [homepageData]);

  const metrics = homepageData?.metrics ?? fallbackMetrics;

  return (
    <>
      <Header activePage="Home" />
      <main>
        <Hero />
        <ScrollReveal delay={40}>
          <StatsSection metrics={metrics} />
        </ScrollReveal>
        <ScrollReveal delay={70}>
          <FeaturesSection features={platformFeatures} />
        </ScrollReveal>
        <ScrollReveal delay={90}>
          <IntelligentSection features={intelligentFeatures} />
        </ScrollReveal>
        <ScrollReveal delay={110}>
          <ProductPreview products={products} />
        </ScrollReveal>
        <ScrollReveal delay={130}>
          <HowItWorks steps={steps} />
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <CtaSection />
        </ScrollReveal>
      </main>
      <Footer />
      <Snackbar toast={toast} onClose={onCloseToast} />
    </>
  );
}

export default function App() {
  const path = window.location.pathname;
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const storedToast = sessionStorage.getItem("stockrevive_snackbar");

    if (storedToast) {
      setToast(JSON.parse(storedToast));
      sessionStorage.removeItem("stockrevive_snackbar");
    }

    function handleSnackbar(event) {
      setToast(event.detail);
    }

    window.addEventListener("stockrevive:snackbar", handleSnackbar);
    return () => window.removeEventListener("stockrevive:snackbar", handleSnackbar);
  }, []);

  if (path === "/login") {
    return <LoginPage />;
  }

  if (path === "/signup") {
    return <SignupPage />;
  }

  if (path === "/retail") {
    return (
      <>
        <RetailPage />
        <Snackbar toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (path === "/wholesale") {
    return (
      <>
        <WholesalePage />
        <Snackbar toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (path === "/my-listings") {
    return (
      <>
        <MyListingsPage />
        <Snackbar toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (path === "/my-stock") {
    return (
      <>
        <MyStockPage />
        <Snackbar toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (path === "/orders") {
    return (
      <>
        <OrdersPage />
        <Snackbar toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (path === "/settings") {
    return (
      <>
        <SettingsPage />
        <Snackbar toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (path === "/insights") {
    return (
      <>
        <InsightsPage />
        <Snackbar toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  if (path.startsWith("/retail/product/")) {
    const productId = path.split("/").filter(Boolean).at(-1);
    return (
      <>
        <ProductDetailPage productId={productId} />
        <Snackbar toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  return <HomePage toast={toast} onCloseToast={() => setToast(null)} />;
}
