import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5183",
    trace: "retain-on-failure",
  },
  webServer: {
    // Vite's default host binds to [::1] (IPv6) only on this machine, which
    // 127.0.0.1 (IPv4) can't reach — force an explicit IPv4 bind so
    // Playwright's health check and baseURL actually connect.
    command: "npm run dev -- --port 5183 --host 127.0.0.1",
    url: "http://127.0.0.1:5183",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://e2e-project.supabase.co",
      VITE_SUPABASE_ANON_KEY: "e2e-anon-key",
      VITE_API_BASE_URL: "https://e2e-api.example.com",
      VITE_DEV_OTP_MODE: "true",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
