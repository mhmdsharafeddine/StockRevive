import React from "react";
import { AlertTriangle, BarChart3, MapPin, ShoppingCart, TrendingUp, Zap } from "lucide-react";

import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";

const metrics = [
  {
    label: "Trending Products",
    value: "28",
    badge: "+24%",
    tone: "green",
    icon: TrendingUp,
  },
  {
    label: "Stock Shortages",
    value: "12",
    badge: "Critical",
    tone: "red",
    icon: AlertTriangle,
  },
  {
    label: "Total Demand",
    value: "2,847",
    badge: "+18%",
    tone: "green",
    icon: ShoppingCart,
  },
  {
    label: "Data Coverage",
    value: "A+",
    badge: "Live",
    tone: "green",
    icon: Zap,
  },
];

const barData = [
  { name: "iPhone 15", supply: 145, demand: 280 },
  { name: "AirPods Pro", supply: 89, demand: 320 },
  { name: "Galaxy S24", supply: 210, demand: 180 },
  { name: "MacBook", supply: 165, demand: 240 },
  { name: "iPad Air", supply: 190, demand: 160 },
];

const regions = [
  { name: "Downtown", value: 35 },
  { name: "North Bay", value: 22 },
  { name: "South Bay", value: 28 },
  { name: "East Bay", value: 15 },
];

const risingProducts = [
  {
    name: "iPhone 15 Pro Max",
    category: "Smartphones",
    growth: "+45%",
    stock: "145 units",
    demand: "280 units",
    gap: "-135 units",
    risk: "High Risk",
    note: "",
  },
  {
    name: "AirPods Pro 2nd Gen",
    category: "Audio",
    growth: "+38%",
    stock: "89 units",
    demand: "320 units",
    gap: "-231 units",
    risk: "Critical",
    note: "Immediate restocking required. Demand exceeds supply by 260%. Consider wholesale purchase within 24-48 hours.",
  },
  {
    name: "MacBook Pro M3",
    category: "Laptops",
    growth: "+29%",
    stock: "210 units",
    demand: "250 units",
    gap: "-40 units",
    risk: "",
    note: "",
  },
  {
    name: "Samsung Galaxy S24",
    category: "Smartphones",
    growth: "+22%",
    stock: "165 units",
    demand: "200 units",
    gap: "-35 units",
    risk: "",
    note: "",
  },
];

function MetricCard({ metric }) {
  const Icon = metric.icon;

  return (
    <article className={`insights-metric insights-metric--${metric.tone}`}>
      <div className="insights-metric__top">
        <span>
          <Icon size={24} />
        </span>
        <small>{metric.badge}</small>
      </div>
      <p>{metric.label}</p>
      <strong>{metric.value}</strong>
    </article>
  );
}

function AreaChart() {
  return (
    <div className="insights-chart insights-chart--area" aria-label="Demand trends by category">
      <svg viewBox="0 0 640 340" role="img">
        <defs>
          <linearGradient id="insights-area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0, 200, 83, 0.56)" />
            <stop offset="100%" stopColor="rgba(0, 200, 83, 0.12)" />
          </linearGradient>
        </defs>
        <polyline className="chart-grid chart-grid--h" points="0,40 640,40" />
        <polyline className="chart-grid chart-grid--h" points="0,116 640,116" />
        <polyline className="chart-grid chart-grid--h" points="0,192 640,192" />
        <polyline className="chart-grid chart-grid--h" points="0,268 640,268" />
        <polyline className="chart-grid chart-grid--v" points="95,0 95,304" />
        <polyline className="chart-grid chart-grid--v" points="205,0 205,304" />
        <polyline className="chart-grid chart-grid--v" points="315,0 315,304" />
        <polyline className="chart-grid chart-grid--v" points="425,0 425,304" />
        <polyline className="chart-grid chart-grid--v" points="535,0 535,304" />
        <path
          className="area-fill"
          d="M0 180 C80 170 120 165 165 125 C205 88 226 40 262 36 C315 35 326 108 378 114 C472 110 555 72 640 28 L640 304 L0 304 Z"
        />
        <path
          className="area-line area-line--top"
          d="M0 180 C80 170 120 165 165 125 C205 88 226 40 262 36 C315 35 326 108 378 114 C472 110 555 72 640 28"
        />
        <path
          className="area-line area-line--mid"
          d="M0 238 C94 230 160 206 230 130 C270 92 314 210 382 196 C470 175 552 150 640 128"
        />
        <path
          className="area-line area-line--low"
          d="M0 270 C120 268 150 250 230 220 C275 204 310 250 382 236 C495 220 560 218 640 198"
        />
      </svg>
      <div className="area-axis area-axis--y">
        <span>1800</span>
        <span>1350</span>
        <span>900</span>
        <span>450</span>
        <span>0</span>
      </div>
      <div className="area-axis area-axis--x">
        {["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="insights-legend">
        <span><i /> Smartphones</span>
        <span><i /> Laptops</span>
        <span><i /> Audio</span>
      </div>
    </div>
  );
}

function BarChart() {
  const max = 330;

  return (
    <div className="insights-chart insights-chart--bars" aria-label="Supply versus demand">
      <div className="bar-grid">
        {[320, 240, 160, 80, 0].map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
      <div className="bars">
        {barData.map((item) => (
          <div className="bar-group" key={item.name}>
            <div className="bar-pair">
              <span className="bar bar--supply" style={{ height: `${(item.supply / max) * 100}%` }} />
              <span className="bar bar--demand" style={{ height: `${(item.demand / max) * 100}%` }} />
            </div>
            <small>{item.name}</small>
          </div>
        ))}
      </div>
      <div className="insights-legend">
        <span><i /> Current Supply</span>
        <span className="legend-danger"><i /> Projected Demand</span>
      </div>
    </div>
  );
}

function RegionDistribution() {
  return (
    <section className="insights-panel insights-panel--wide">
      <h2>
        <MapPin size={22} />
        Regional Demand Distribution
      </h2>
      <div className="region-layout">
        <div className="region-pie" aria-label="Regional demand pie chart">
          <span className="region-label region-label--downtown">Downtown: 35%</span>
          <span className="region-label region-label--north">North Bay: 22%</span>
          <span className="region-label region-label--south">South Bay: 28%</span>
          <span className="region-label region-label--east">East Bay: 15%</span>
        </div>
        <div className="region-bars">
          {regions.map((region) => (
            <div className="region-row" key={region.name}>
              <div>
                <strong>{region.name}</strong>
                <span>{region.value}%</span>
              </div>
              <i>
                <b style={{ width: `${region.value}%` }} />
              </i>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RisingProducts() {
  return (
    <section className="insights-panel insights-panel--wide rising-products">
      <div className="insights-panel__heading">
        <h2>Rising Demand Products</h2>
        <span>Trending Now</span>
      </div>
      <div className="rising-list">
        {risingProducts.map((product, index) => (
          <article className="rising-item" key={product.name}>
            <div className="rising-item__top">
              <div>
                <h3>
                  {index + 1}. {product.name}
                  <span>{product.category}</span>
                </h3>
                <p>Demand growing at <strong>{product.growth}</strong></p>
              </div>
              {product.risk && (
                <small className={product.risk === "Critical" ? "risk-badge risk-badge--critical" : "risk-badge"}>
                  {product.risk}
                </small>
              )}
            </div>
            <div className="rising-item__stats">
              <div>
                <span>Current Stock</span>
                <strong>{product.stock}</strong>
              </div>
              <div>
                <span>Projected Demand</span>
                <strong>{product.demand}</strong>
              </div>
              <div>
                <span>Gap</span>
                <strong>{product.gap}</strong>
              </div>
            </div>
            {product.note && (
              <p className="restock-note">
                <Zap size={18} />
                Restock note: {product.note}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function InsightsPage() {
  return (
    <>
      <Header activePage="Insights" />
      <main className="insights-page">
        <section className="insights-hero">
          <div>
            <h1>Insights Dashboard</h1>
            <p>Inventory analytics and demand visibility for store planning.</p>
          </div>
          <span>
            <BarChart3 size={16} />
            Analytics
          </span>
        </section>

        <section className="insights-metrics">
          {metrics.map((metric) => (
            <MetricCard metric={metric} key={metric.label} />
          ))}
        </section>

        <section className="insights-chart-grid">
          <article className="insights-panel">
            <h2>Demand Trends by Category</h2>
            <AreaChart />
          </article>
          <article className="insights-panel">
            <h2>Supply vs Demand</h2>
            <BarChart />
          </article>
        </section>

        <RegionDistribution />
        <RisingProducts />
      </main>
      <Footer />
    </>
  );
}
