/*
  VOYX ADMIN | BOM
  Thin REST wrapper for Supabase PostgREST.

  IMPORTANT:
  - Replace SUPABASE_URL and SUPABASE_ANON_KEY in app.js.
  - Do NOT put a service_role key in browser code.
  - The anon key is intended for client-side use and must be protected by
    Supabase Row Level Security (RLS) policies.

  POSTMAN / REST ENDPOINTS
  ---------------------------------------------------------------------------
  Base:
    GET {SUPABASE_URL}/rest/v1/<table>

  Required headers:
    apikey: <SUPABASE_ANON_KEY>
    Authorization: Bearer <SUPABASE_ANON_KEY>
    Content-Type: application/json

  Examples:
    GET /rest/v1/daily_performance?select=*
    GET /rest/v1/monthly_performance?select=*
    GET /rest/v1/sales_leaderboard?select=*&order=mtd_orders.desc
    GET /rest/v1/top_destinations?select=*&order=order_count.desc
    GET /rest/v1/daily_summary_chart?select=*&order=date.asc
    GET /rest/v1/monthly_summary_chart?select=*&order=month_label.asc

  Postman setup:
    1. Create environment variables:
       SUPABASE_URL
       SUPABASE_ANON_KEY
    2. Header apikey = {{SUPABASE_ANON_KEY}}
    3. Header Authorization = Bearer {{SUPABASE_ANON_KEY}}
    4. URL = {{SUPABASE_URL}}/rest/v1/<table>
*/

function createSupabaseRestClient(baseUrl, anonKey) {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");

  async function request(table, query = {}) {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });

    const url = `${normalizedBase}/rest/v1/${encodeURIComponent(table)}${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
    });

    const rawText = await response.text();
    let data;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = rawText;
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.hint ||
        data?.details ||
        rawText ||
        `HTTP ${response.status}`;

      throw new Error(`${response.status}: ${message}`);
    }

    return data;
  }

  return {
    request,

    getDailyPerformance: () =>
      request("daily_performance", { select: "*" }),

    getMonthlyPerformance: () =>
      request("monthly_performance", { select: "*" }),

    getLeaderboard: () =>
      request("sales_leaderboard", {
        select: "*",
        order: "mtd_orders.desc",
      }),

    getTopDestinations: () =>
      request("top_destinations", {
        select: "*",
        order: "order_count.desc",
      }),

    getDailyChart: () =>
      request("daily_summary_chart", {
        select: "*",
        order: "date.asc",
      }),

    getMonthlyChart: () =>
      request("monthly_summary_chart", {
        select: "*",
        order: "month_label.asc",
      }),
  };
}


"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbnRpc2V0dnBoYXN2Y2RnZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NDUwMjEsImV4cCI6MjA5NzUyMTAyMX0.YsnYhzRA9x7WAgSg_EX1y480R1lJ5Cc7evwmYUWAf3Y";