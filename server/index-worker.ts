import { httpServerHandler } from "cloudflare:node";

type WorkerHandler = ReturnType<typeof httpServerHandler>;

let expressHandlerPromise: Promise<WorkerHandler> | undefined;

function initializeProcessEnvironment(workerEnv: Env): void {
  const runtimeEnv = workerEnv as unknown as Record<string, string | undefined>;
  const values: Record<string, string | undefined> = {
    DATABASE_URL: workerEnv.HYPERDRIVE.connectionString,
    APP_URL: workerEnv.APP_URL,
    ENVIRONMENT: workerEnv.ENVIRONMENT,
    NODE_ENV: runtimeEnv.NODE_ENV,
    ADMIN_EMAILS: runtimeEnv.ADMIN_EMAILS,
    CRON_SECRET: runtimeEnv.CRON_SECRET,
    GOOGLE_MAPS_API_KEY: runtimeEnv.GOOGLE_MAPS_API_KEY,
    SESSION_SECRET: runtimeEnv.SESSION_SECRET,
    SOCRATA_APP_TOKEN: runtimeEnv.SOCRATA_APP_TOKEN,
    STRIPE_LIVE_PUBLISHABLE_KEY: runtimeEnv.STRIPE_LIVE_PUBLISHABLE_KEY,
    STRIPE_LIVE_SECRET_KEY: runtimeEnv.STRIPE_LIVE_SECRET_KEY,
    STRIPE_TEST_PUBLISHABLE_KEY: runtimeEnv.STRIPE_TEST_PUBLISHABLE_KEY,
    STRIPE_TEST_SECRET_KEY: runtimeEnv.STRIPE_TEST_SECRET_KEY,
    STRIPE_SEASON_PASS_PRODUCT_ID: workerEnv.STRIPE_SEASON_PASS_PRODUCT_ID,
    STRIPE_SEASON_PASS_PRICE_ID: workerEnv.STRIPE_SEASON_PASS_PRICE_ID,
    STRIPE_WEBHOOK_SECRET: runtimeEnv.STRIPE_WEBHOOK_SECRET,
  };

  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined && process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
}

async function initializeExpress(workerEnv: Env): Promise<WorkerHandler> {
  initializeProcessEnvironment(workerEnv);

  const [{ app }, { registerRoutes }, { registerWorkerStaticRoutes }] = await Promise.all([
    import("./app"),
    import("./routes"),
    import("./workerStatic"),
  ]);

  const server = await registerRoutes(app);

  app.use((error: unknown, _req: unknown, res: { headersSent: boolean; status: (code: number) => { json: (body: unknown) => void } }, _next: unknown) => {
    console.error(JSON.stringify({
      message: "Unhandled Worker application error",
      error: error instanceof Error ? error.message : String(error),
    }));
    if (!res.headersSent) res.status(500).json({ message: "Internal Server Error" });
  });

  registerWorkerStaticRoutes(app);
  // Bind the Node server directly using Cloudflare's documented simplified
  // adapter so it owns the listener lifecycle.
  // Node's Server.address() also permits null, while the Workers adapter's
  // structural type omits that pre-listen state. The runtime object is the
  // supported Node server described by Cloudflare's direct-server overload.
  return httpServerHandler(server as Parameters<typeof httpServerHandler>[0]);
}

function getExpressHandler(workerEnv: Env): Promise<WorkerHandler> {
  expressHandlerPromise ??= initializeExpress(workerEnv).catch((error) => {
    expressHandlerPromise = undefined;
    throw error;
  });
  return expressHandlerPromise;
}

function shouldServeAsset(pathname: string): boolean {
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return false;
  return pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico" ||
    /\.(?:avif|css|csv|gif|ico|jpe?g|json|map|png|svg|txt|webmanifest|webp|woff2?)$/i.test(pathname);
}

async function runScheduledTask(cron: string, workerEnv: Env): Promise<void> {
  initializeProcessEnvironment(workerEnv);
  const { withDatabaseConnection } = await import("./db");

  await withDatabaseConnection(async () => {
    if (cron === "*/15 * * * *") {
      const [{ flushApiLogsNow }, { pruneApiObservabilityData, runAbuseDetection }] = await Promise.all([
        import("./apiObservability"),
        import("./services/apiAbuseDetector"),
      ]);
      await flushApiLogsNow();
      await pruneApiObservabilityData();
      await runAbuseDetection();
      return;
    }

    if (cron === "0 14 * * *") {
      const { processDripCampaign } = await import("./dripCampaign");
      await processDripCampaign();
      return;
    }

    if (cron === "0 9 1 * *") {
      const { runSafetySync } = await import("./services/safetyIndex");
      await runSafetySync({ months: 24 });
      return;
    }

    console.warn(JSON.stringify({ message: "Unknown scheduled trigger", cron }));
  });
}

export default {
  async fetch(request, workerEnv, ctx): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (shouldServeAsset(pathname)) return workerEnv.ASSETS.fetch(request);

    const expressHandler = await getExpressHandler(workerEnv);
    if (!expressHandler.fetch) {
      return Response.json({ error: "Worker handler unavailable" }, { status: 500 });
    }
    const response = await expressHandler.fetch(request, workerEnv, ctx);

    // The experimental Node HTTP bridge can expose a streamed response with a
    // stale transfer length on HTTP/2 and HTTP/3. Chrome then loses the final
    // JSON chunk even though Express and the Worker both report 200. Rebuild
    // API JSON responses from a completed buffer and let Workers calculate the
    // wire framing instead of forwarding Node's transport headers.
    const contentType = response.headers.get("content-type") || "";
    if (response.body && contentType.toLowerCase().includes("application/json")) {
      const body = await response.arrayBuffer();
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      headers.delete("transfer-encoding");
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },

  scheduled(controller, workerEnv, ctx): void {
    ctx.waitUntil(runScheduledTask(controller.cron, workerEnv));
  },
} satisfies ExportedHandler<Env>;
