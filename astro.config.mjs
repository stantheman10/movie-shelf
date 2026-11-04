import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import node from "@astrojs/node";

// DEPLOY_TARGET=docker builds a standalone Node server; otherwise Vercel.
const docker = process.env.DEPLOY_TARGET === "docker";

export default defineConfig({
  output: "server",
  adapter: docker ? node({ mode: "standalone" }) : vercel(),
  server: { host: true },
});
