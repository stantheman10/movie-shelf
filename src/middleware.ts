import { defineMiddleware } from "astro:middleware";
import { createApiLimiter, SMART_PATH } from "./lib/api-limit";

const limit = createApiLimiter({ perIp: 90, global: 900, windowMs: 60_000 });
// Smart search spends a shared free NVIDIA quota (~40 req/min), so keep the global cap well under it.
const limitSmart = createApiLimiter({ perIp: 10, global: 30, windowMs: 60_000, guard: (p) => p === SMART_PATH });

export const onRequest = defineMiddleware((ctx, next) =>
  limit(ctx.request, ctx.url.pathname) ?? limitSmart(ctx.request, ctx.url.pathname) ?? next());
