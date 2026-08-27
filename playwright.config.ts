import "dotenv/config";
import { defineConfig } from "@playwright/test";
import { getBaseUrl } from "./src/support/env.js";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./artifacts/test-results",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // AI/LLM operations may take an arbitrarily long time. Ordinary browser
  // actions, navigation, and non-AI assertions still have finite timeouts below.
  timeout: 0,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: getBaseUrl(),
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    trace: "on",
    video: "on",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
});
