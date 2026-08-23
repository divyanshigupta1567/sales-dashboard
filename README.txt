VOYX ADMIN | BOM

1. Open app.js.
2. Replace:
   SUPABASE_URL = "YOUR_SUPABASE_URL";
   SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
3. Adjust TABLES and the column aliases in the normalization functions if your schema differs.
4. Serve the folder through a local web server rather than opening index.html directly.

Example with Python:
  python3 -m http.server 5500

Then open:
  http://localhost:5500

The dashboard falls back to screenshot-matching mock data when Supabase is not configured or a query fails.

Postman:
Use the endpoint examples and headers documented at the top of api.js.

