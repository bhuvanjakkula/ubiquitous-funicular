import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
process.env.PLAYWRIGHT_BROWSERS_PATH ||= ".playwright-browsers";
export default defineConfig({testDir:"./tests/e2e",use:{baseURL:"http://127.0.0.1:3000"},webServer:{command:"pnpm dev",url:"http://127.0.0.1:3000",reuseExistingServer:false}});
