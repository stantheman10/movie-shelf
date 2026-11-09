import { defineMiddleware } from "astro:middleware";
import { createApiLimiter } from "./lib/api-limit";

const limit = createApiLimiter({ perIp: 90, global: 900, windowMs: 60_000 });

export const onRequest = defineMiddleware((ctx, next) => limit(ctx.request, ctx.url.pathname) ?? next());
