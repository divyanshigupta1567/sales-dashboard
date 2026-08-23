/*
  VOYX ADMIN | BOM
  Main dashboard application.

  Fixes in this version:
  - setLoadingState(false) is now guaranteed to run (via finally),
    so the dashboard no longer gets stuck showing "—" forever.
  - kpi_metrics is read as ONE flattened row (today_sales, mtd_sales,
    prev_month_same_day_sales, prev_month_sales, ...), matching the
    actual get_sales_dashboard() RPC shape, instead of the old
    three-separate-rows assumption.
  - sales_rep_metrics field names (sales_rep, tdy_sales, tdy_revenue,
    mtd_sales, mtd_revenue) are mapped correctly. ARPU is computed
    client-side. target / target_pct / prev_month_orders are NOT
    present in the RPC output — these render as "—" instead of a
    fake 0, since faking them would be misleading.
  - Daily/monthly charts and destinations are fetched from their
    original separate tables (not the RPC's daily_metrics/month_metrics,
    which don't contain revenue or formatted month labels and would
    render blank).
  - A functional <input type="date"> now drives loadDashboard(), fully
    replacing the static datePill text.
*/

console.log("🔥 APP.JS LOADED");

const SUPABASE_URL = "https://ppntisetvphasvcdgfdq.supabase.co";
const SUPABASE_ANON_KEY = 
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbnRpc2V0dnBoYXN2Y2RnZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NDUwMjEsImV4cCI6MjA5NzUyMTAyMX0.YsnYhzRA9x7WAgSg_EX1y480R1lJ5Cc7evwmYUWAf3Y";

/* Table names are centralized so schema changes are easy. */
const TABLES = {
  dailyPerformance: "daily_performance",
  monthlyPerformance: "monthly_performance",
  leaderboard: "sales_leaderboard",
  destinations: "destinations",
  dailyChart: "daily_summary_chart",
  monthlyChart: "monthly_summary_chart",
};

/* Default / initial dashboard date (ISO format, matches <input type="date">). */
const DASHBOARD_DATE = "2026-05-17";

/* Supabase configuration check */
const isSupabaseConfigured =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("YOUR_") &&
  !SUPABASE_ANON_KEY.includes("YOUR_");

const supabaseClient =
  isSupabaseConfigured && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const restApi =
  typeof createSupabaseRestClient === "function"
    ? createSupabaseRestClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

let leaderboardData = [];
let dailyChartInstance = null;
let monthlyChartInstance = null;

/* Currently selected report date. This is the single source of truth —
   everything (RPC call, date picker display, toast messages) reads from it. */
let currentDate = DASHBOARD_DATE;

/* ---------- MOCK DATA (fallback when Supabase is unreachable) ---------- */

const MOCK = {
  /* Shaped to match the REAL get_sales_dashboard() kpi_metrics row exactly,
     so renderDailyPerformance/renderMonthlyPerformance need no special-casing. */
  kpiMetrics: [
    {
      today_sales: 33,
      today_revenue: 30800,
      mtd_sales: 658,
      mtd_revenue: 574690,
      prev_month_same_day_sales: 536,
      prev_month_same_day_revenue: 459440,
      prev_month_sales: 964,
      prev_month_revenue: 818900,
    },
  ],

  leaderboard: [
    { sales_r: "Faizan", day_orders: 10, day_revenue: 9500, mtd_orders: 155, mtd_rev: 143300, arpu: 924, target_pct: 124, target: 125, prev_month_orders: 84 },
    { sales_r: "Talha", day_orders: 4, day_revenue: 5000, mtd_orders: 121, mtd_rev: 103700, arpu: 857, target_pct: 97, target: 125, prev_month_orders: 44 },
    { sales_r: "Bhageshri", day_orders: 4, day_revenue: 2500, mtd_orders: 119, mtd_rev: 94000, arpu: 790, target_pct: 95, target: 125, prev_month_orders: 60 },
    { sales_r: "Nidhi", day_orders: 5, day_revenue: 4200, mtd_orders: 95, mtd_rev: 78800, arpu: 829, target_pct: 76, target: 125, prev_month_orders: 50 },
    { sales_r: "Sanika", day_orders: 5, day_revenue: 5700, mtd_orders: 95, mtd_rev: 83300, arpu: 877, target_pct: 76, target: 125, prev_month_orders: 54 },
    { sales_r: "Prabhat", day_orders: 3, day_revenue: 2800, mtd_orders: 64, mtd_rev: 62600, arpu: 979, target_pct: 51, target: 125, prev_month_orders: 75 },
    { sales_r: "Farooq", day_orders: 2, day_revenue: 1100, mtd_orders: 9, mtd_rev: 9000, arpu: 997, target_pct: 7, target: 125, prev_month_orders: 0 },
  ],

  destinations: [
    { destination_name: "Thailand [True]", order_count: 231 },
    { destination_name: "Thailand", order_count: 206 },
    { destination_name: "Singapore, Malaysia", order_count: 33 },
    { destination_name: "Vietnam", order_count: 30 },
    { destination_name: "Singapore, Malaysia, Thailand...", order_count: 17 },
    { destination_name: "Japan", order_count: 15 },
    { destination_name: "Singapore, Malaysia, Indonesia...", order_count: 10 },
  ],

  dailyChart: [
    { date: "2026-06-01", order_count: 36 },
    { date: "2026-06-02", order_count: 44 },
    { date: "2026-06-03", order_count: 36 },
    { date: "2026-06-04", order_count: 49 },
    { date: "2026-06-05", order_count: 31 },
    { date: "2026-06-06", order_count: 32 },
    { date: "2026-06-07", order_count: 57 },
    { date: "2026-06-08", order_count: 40 },
    { date: "2026-06-09", order_count: 39 },
    { date: "2026-06-10", order_count: 25 },
    { date: "2026-06-11", order_count: 41 },
    { date: "2026-06-12", order_count: 24 },
    { date: "2026-06-13", order_count: 27 },
    { date: "2026-06-14", order_count: 28 },
    { date: "2026-06-15", order_count: 53 },
    { date: "2026-06-16", order_count: 30 },
    { date: "2026-06-17", order_count: 32 },
    { date: "2026-06-18", order_count: 33 },
  ],

  monthlyChart: [
    { month_label: "Nov 25", revenue: 90, order_count: 90 },
    { month_label: "Dec 25", revenue: 210, order_count: 210 },
    { month_label: "Jan 26", revenue: 335, order_count: 335 },
    { month_label: "Feb 26", revenue: 420, order_count: 420 },
    { month_label: "Mar 26", revenue: 530, order_count: 530 },
    { month_label: "Apr 26", revenue: 690, order_count: 690 },
    { month_label: "May 26", revenue: 950, order_count: 950 },
    { month_label: "Jun 26", revenue: 650, order_count: 650 },
  ],
};

/* ---------- GENERIC HELPERS ---------- */

function firstDefined(obj, keys, fallback = 0) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") {
      return obj[key];
    }
  }
  return fallback;
}

/* True if the object actually contains one of these keys (even if the value
   is 0). Used to tell "field is genuinely 0" apart from "field doesn't exist
   in this data source at all" — the latter should render as "—", not "0". */
function hasAnyKey(obj, keys) {
  return keys.some(
    (key) =>
      obj &&
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== null &&
      obj[key] !== undefined
  );
}

function numberValue(value) {
  if (typeof value === "number") return value;

  const cleaned = String(value ?? "")
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/K/gi, "");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  const n = numberValue(value);

  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(2)}K`;

  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function rupees(value) {
  return `₹${Math.round(numberValue(value)).toLocaleString("en-IN")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Converts "2026-06-18" into "18 Jun 2026" for toasts / display text. */
function formatDisplayDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;

  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

/*
  Converts Supabase JSON into an array.
  Supports:
  1. Array
  2. Single object
  3. Object containing metric objects
  4. Object keyed by salesperson
*/
function normalizeRows(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "object") return [];

  const metricKeys = [
    "mtd",
    "same_day",
    "sameDay",
    "prev_month",
    "previous_month",
    "prev_month_same_day",
  ];

  if (metricKeys.some((key) => Object.prototype.hasOwnProperty.call(value, key))) {
    return metricKeys
      .filter((key) => value[key] !== undefined)
      .map((key) => {
        const row = value[key];
        if (row && typeof row === "object") return { metric: key, ...row };
        return { metric: key, value: row };
      });
  }

  const values = Object.values(value);

  if (
    values.length > 0 &&
    values.every((item) => item && typeof item === "object" && !Array.isArray(item))
  ) {
    return values;
  }

  return [value];
}

/* ---------- REQUIRED ASYNC DATA FUNCTIONS ---------- */
/* NOTE: these still fetch the WHOLE table unfiltered, same as the original
   file. They are not currently date-scoped from the client side — doing
   that safely requires confirming the actual filterable column names in
   daily_summary_chart / monthly_summary_chart / top_destinations first. */

async function fetchTopDestinations() {
  if (!supabaseClient) return MOCK.destinations;

  try {
    const { data, error } = await supabaseClient
      .schema("sales_dashboard")
      .from(TABLES.destinations)
      .select("*")
      .order("order_count", { ascending: false });

    if (error) throw error;
    return data?.length ? data : MOCK.destinations;
  } catch (error) {
    console.error("fetchTopDestinations:", error);
    return MOCK.destinations;
  }
}

async function fetchDailyChart() {
  if (!supabaseClient) return MOCK.dailyChart;

  try {
    const { data, error } = await supabaseClient
      .schema("sales_dashboard")
      .from(TABLES.dailyChart)
      .select("*")
      .order("date", { ascending: true });

    if (error) throw error;
    return data?.length ? data : MOCK.dailyChart;
  } catch (error) {
    console.error("fetchDailyChart:", error);
    return MOCK.dailyChart;
  }
}

async function fetchMonthlyChart() {
  if (!supabaseClient) return MOCK.monthlyChart;

  try {
    const { data, error } = await supabaseClient
      .schema("sales_dashboard")
      .from(TABLES.monthlyChart)
      .select("*")
      .order("month_label", { ascending: true });

    if (error) throw error;
    return data?.length ? data : MOCK.monthlyChart;
  } catch (error) {
    console.error("fetchMonthlyChart:", error);
    return MOCK.monthlyChart;
  }
}

/* ---------- KPI RENDERING ---------- */

/* kpi_metrics from the RPC is a single flattened row containing
   today_sales/today_revenue/mtd_sales/... all together. */
function renderDailyPerformance(rows) {
  rows = normalizeRows(rows);
  const row = rows[0] || {};

  const orders = firstDefined(
    row,
    ["today_sales", "orders", "order_count", "today_orders", "day_orders"],
    0
  );

  const revenue = firstDefined(
    row,
    ["today_revenue", "revenue", "day_revenue", "total_revenue"],
    0
  );

  document.getElementById("todayOrders").textContent = numberValue(orders).toLocaleString("en-IN");
  document.getElementById("todayRevenue").textContent = money(revenue);
}

function renderMonthlyPerformance(rows) {
  rows = normalizeRows(rows);
  const row = rows[0] || {};

  const set = (id, keys, formatter) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = formatter(firstDefined(row, keys));
  };

  set("mtdOrders", ["mtd_sales", "orders", "order_count", "mtd_orders"], (v) =>
    numberValue(v).toLocaleString("en-IN")
  );
  set("mtdRevenue", ["mtd_revenue", "revenue", "mtd_rev"], money);

  set(
    "sameDayOrders",
    ["prev_month_same_day_sales", "same_day_orders", "prev_month_same_day_orders"],
    (v) => numberValue(v).toLocaleString("en-IN")
  );
  set(
    "sameDayRevenue",
    ["prev_month_same_day_revenue", "same_day_revenue", "same_day_rev"],
    money
  );

  set("prevMonthOrders", ["prev_month_sales", "prev_month_orders"], (v) =>
    numberValue(v).toLocaleString("en-IN")
  );
  set("prevMonthRevenue", ["prev_month_revenue", "prev_month_rev"], money);
}

/* ---------- LEADERBOARD ---------- */

function targetColor(percent) {
  const p = numberValue(percent);
  if (p >= 100) return "#f5821f";
  if (p >= 75) return "#f89b42";
  if (p >= 50) return "#f5b36f";
  return "#f6c28d";
}

function renderLeaderboard(rows, isLive) {
  rows = normalizeRows(rows);

  leaderboardData = rows.map((row) => {
    const day_orders = numberValue(
      firstDefined(row, ["tdy_sales", "day_orders", "today_orders", "orders_day", "orders"], 0)
    );
    const day_revenue = numberValue(
      firstDefined(row, ["tdy_revenue", "day_revenue", "today_revenue", "revenue_day"], 0)
    );
    const mtd_orders = numberValue(
      firstDefined(row, ["mtd_sales", "mtd_orders", "month_orders", "orders_mtd"], 0)
    );
    const mtd_rev = numberValue(
      firstDefined(row, ["mtd_revenue", "mtd_rev", "month_revenue"], 0)
    );

    /* ARPU: use it if the data source provides it, otherwise derive it. */
    const arpu = hasAnyKey(row, ["arpu", "avg_revenue_per_order"])
      ? numberValue(firstDefined(row, ["arpu", "avg_revenue_per_order"], 0))
      : mtd_orders > 0
      ? mtd_rev / mtd_orders
      : 0;

    /* These three fields do not exist in the live RPC output at all.
       Rather than show a misleading "0", we render "—" when absent. */
    const target_pct = hasAnyKey(row, ["target_pct", "target_percent", "target_percentage"])
      ? numberValue(firstDefined(row, ["target_pct", "target_percent", "target_percentage"], 0))
      : null;

    const target = hasAnyKey(row, ["target", "target_orders", "monthly_target"])
      ? numberValue(firstDefined(row, ["target", "target_orders", "monthly_target"], 0))
      : null;

    const prev_month_orders = hasAnyKey(row, [
      "prev_month_orders",
      "pv_month",
      "previous_month_orders",
    ])
      ? numberValue(
          firstDefined(row, ["prev_month_orders", "pv_month", "previous_month_orders"], 0)
        )
      : null;

    return {
      sales_r: firstDefined(row, ["sales_rep", "sales_r", "rep_name", "name"], "—"),
      day_orders,
      day_revenue,
      mtd_orders,
      mtd_rev,
      arpu,
      target_pct,
      target,
      prev_month_orders,
    };
  });

  const body = document.getElementById("leaderboardBody");
  if (!body) return;

  body.innerHTML = leaderboardData
    .map((row, index) => {
      const hasTarget = row.target_pct !== null;
      const pct = hasTarget ? Math.max(0, Math.min(row.target_pct, 100)) : 0;
      const color = hasTarget ? targetColor(row.target_pct) : "#e5e7eb";

      return `
        <tr>
          <td>${index + 1}</td>
          <td><span class="rep-name">${escapeHtml(row.sales_r)}</span></td>
          <td class="day-cell">
            ${row.day_orders}
            <span class="subtext">${money(row.day_revenue)}</span>
          </td>
          <td class="mtd-count">${row.mtd_orders}</td>
          <td class="money">${money(row.mtd_rev)}</td>
          <td class="money">${rupees(row.arpu)}</td>
          <td class="target-cell">
            <div class="target-top">
              <span class="target-percent">${hasTarget ? `${row.target_pct}%` : "—"}</span>
              <span class="target-value">${row.target === null ? "—" : row.target}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
            </div>
          </td>
          <td>${row.prev_month_orders === null ? "—" : row.prev_month_orders}</td>
        </tr>
      `;
    })
    .join("");

  setDataStatus({ live: isLive });
}

/* ---------- DESTINATIONS ---------- */

function renderDestinations(rows) {
  rows = normalizeRows(rows);

  const list = document.getElementById("destinationList");
  if (!list) return;

  list.innerHTML = rows
    .map((row) => {
      const name = firstDefined(
        row,
        ["destination_name", "destination", "name", "dest"],
        "Unknown"
      );
      const count = numberValue(
        firstDefined(row, ["order_count", "orders", "count", "total_orders"], 0)
      );

      return `
        <div class="destination-row">
          <div class="destination-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
          <div class="destination-count">${count}</div>
        </div>
      `;
    })
    .join("");
}

/* ---------- CHARTS ---------- */

const chartFont = { family: "Inter, system-ui, sans-serif", size: 9 };

function buildChartOptions(maxY, stepSize) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 450 },
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#12172b",
        titleFont: { family: "Inter", size: 10 },
        bodyFont: { family: "Inter", size: 10 },
        padding: 9,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#8e949e",
          font: chartFont,
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false,
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        max: maxY,
        ticks: { stepSize, color: "#8e949e", font: chartFont },
        grid: { color: "#f0f1f3", drawBorder: false },
        border: { display: false },
      },
    },
  };
}

function renderDailyChart(rows) {
  rows = normalizeRows(rows);

  const labels = rows.map((row) => {
    const raw = String(firstDefined(row, ["date", "day", "label"], ""));
    const date = new Date(raw);
    return Number.isNaN(date.getTime())
      ? raw
      : `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });

  const values = rows.map((row) =>
    numberValue(firstDefined(row, ["order_count", "orders", "count", "value"], 0))
  );

  const ctx = document.getElementById("dailyChart");
  if (!ctx || typeof Chart === "undefined") return;

  dailyChartInstance?.destroy();

  dailyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: "#f5821f",
          backgroundColor: "rgba(245,130,31,0.06)",
          fill: true,
          borderWidth: 2,
          tension: 0.36,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#f5821f",
          pointBorderColor: "#fff",
          pointBorderWidth: 1,
        },
      ],
    },
    options: buildChartOptions(60, 10),
  });
}

function renderMonthlyChart(rows) {
  rows = normalizeRows(rows);

  const labels = rows.map((row) => firstDefined(row, ["month_label", "month", "label"], ""));
  const values = rows.map((row) =>
    numberValue(firstDefined(row, ["revenue", "order_count", "orders", "value"], 0))
  );

  const ctx = document.getElementById("monthlyChart");
  if (!ctx || typeof Chart === "undefined") return;

  monthlyChartInstance?.destroy();

  monthlyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: "#f5821f",
          backgroundColor: "rgba(245,130,31,0.05)",
          fill: true,
          borderWidth: 2,
          tension: 0.36,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#f5821f",
          pointBorderColor: "#fff",
          pointBorderWidth: 1,
        },
      ],
    },
    options: buildChartOptions(1000, 200),
  });
}

/* ---------- CSV ---------- */

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadLeaderboardCsv() {
  if (!leaderboardData.length) {
    showToast("There is no leaderboard data to download.");
    return;
  }

  const headers = [
    "#",
    "SALES_R",
    "#DAY",
    "DAY_REVENUE",
    "#MTD",
    "MTD_REV",
    "ARPU",
    "TARGET_PERCENT",
    "TARGET",
    "#PV_MONTH",
  ];

  const lines = [
    headers.map(csvCell).join(","),
    ...leaderboardData.map((row, index) =>
      [
        index + 1,
        row.sales_r,
        row.day_orders,
        row.day_revenue,
        row.mtd_orders,
        row.mtd_rev,
        row.arpu,
        row.target_pct,
        row.target,
        row.prev_month_orders,
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `voyx-leaderboard-${currentDate}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  showToast("Leaderboard CSV downloaded.");
}

/* ---------- DATE PICKER ---------- */

function injectBaseStyles() {
  if (document.getElementById("voyxDynamicStyles")) return;

  const style = document.createElement("style");
  style.id = "voyxDynamicStyles";
  style.textContent = `
    .date-picker-input {
      font: inherit;
      color: inherit;
      background: transparent;
      border: none;
      outline: none;
      cursor: pointer;
      width: 100%;
    }
    .dashboard-loading {
      opacity: 0.55;
      pointer-events: none;
      transition: opacity 150ms ease;
    }
  `;
  document.head.appendChild(style);
}

/* Creates the date input inside the existing #datePill container.
   Safe to call multiple times — returns the existing input if already built. */
function installDatePicker() {
  const existing = document.getElementById("dashboardDatePicker");
  if (existing) return existing;

  const container = document.getElementById("datePill");
  if (!container) return null;

  injectBaseStyles();
  container.innerHTML = "";

  const picker = document.createElement("input");
  picker.type = "date";
  picker.id = "dashboardDatePicker";
  picker.className = "date-picker-input";
  picker.value = currentDate;

  picker.addEventListener("change", (event) => {
    const newDate = event.target.value;
    if (!newDate) return;

    loadDashboard(newDate).catch((error) => {
      console.error("Dashboard load failed:", error);
      setDataStatus({ live: false });
      showToast("Dashboard load failed. Check the browser console.");
    });
  });

  container.appendChild(picker);
  return picker;
}

function ensureDatePicker() {
  return document.getElementById("dashboardDatePicker") || installDatePicker();
}

function setLoadingState(isLoading) {
  document.body.classList.toggle("dashboard-loading", isLoading);

  const picker = document.getElementById("dashboardDatePicker");
  if (picker) picker.disabled = isLoading;
}

function setDataStatus({ loading, live } = {}) {
  const status = document.getElementById("leaderboardStatus");
  if (!status) return;

  if (loading) {
    status.textContent = "Loading…";
    return;
  }

  status.textContent = live ? "Live" : "Preview data";
}

/* ---------- INITIAL LOAD ---------- */

async function loadDashboard(selectedDate = currentDate) {
  currentDate = selectedDate;

  const picker = ensureDatePicker();
  if (picker) picker.value = currentDate;

  setLoadingState(true);
  setDataStatus({ loading: true });

  try {
    console.log(`🔄 Fetching dashboard data for ${currentDate}...`);

    if (!supabaseClient) {
      throw new Error("Supabase client is not configured.");
    }

    /* Main date-scoped RPC call. */
    const { data, error } = await supabaseClient.rpc("get_sales_dashboard", {
      report_date: currentDate,
    });

    if (error) {
      console.error("❌ Supabase RPC Error:", error);
      throw error;
    }

    console.log("✅ Dashboard Data:", data);

    const dashboard = data?.[0] || {};

    /*
      RPC JSON fields:
        daily_metrics, month_metrics, kpi_metrics, sales_rep_metrics
      kpi_metrics / sales_rep_metrics drive the KPI cards + leaderboard.
      Charts + destinations intentionally still use the separate tables
      (daily_metrics/month_metrics lack revenue + formatted labels).
    */
    renderDailyPerformance(dashboard.kpi_metrics);
    renderMonthlyPerformance(dashboard.kpi_metrics);
    renderLeaderboard(dashboard.sales_rep_metrics, true);

    const [destinations, dailyChart, monthlyChart] = await Promise.all([
      fetchTopDestinations(),
      fetchDailyChart(),
      fetchMonthlyChart(),
    ]);

    renderDestinations(destinations);
    renderDailyChart(dailyChart);
    renderMonthlyChart(monthlyChart);

    console.log(`✅ Dashboard rendered successfully for ${currentDate}.`);
  } catch (error) {
    console.error("❌ Dashboard Error:", error);

    /* Preview fallback — only used when the live RPC/table requests fail. */
    renderDailyPerformance(MOCK.kpiMetrics);
    renderMonthlyPerformance(MOCK.kpiMetrics);
    renderLeaderboard(MOCK.leaderboard, false);
    renderDestinations(MOCK.destinations);
    renderDailyChart(MOCK.dailyChart);
    renderMonthlyChart(MOCK.monthlyChart);

    showToast(`Dashboard is showing preview data. Could not load ${formatDisplayDate(currentDate)}.`);
  } finally {
    /* This ALWAYS runs, success or failure — fixes the bug where the
       dashboard got stuck showing "—" forever. */
    setLoadingState(false);
  }
}

/* ---------- DOM READY ---------- */

document.addEventListener("DOMContentLoaded", () => {
  installDatePicker();

  document.getElementById("downloadCsvBtn")?.addEventListener("click", downloadLeaderboardCsv);

  document.getElementById("logoutLink")?.addEventListener("click", (event) => {
    event.preventDefault();
    showToast("Connect your auth flow here.");
  });

  loadDashboard(currentDate).catch((error) => {
    console.error("Dashboard load failed:", error);
    setDataStatus({ live: false });
    showToast("Dashboard load failed. Check the browser console.");
  });
});