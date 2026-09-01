import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";

import { registerRoutes } from "./routes";
import { databaseContextMiddleware } from "./db";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(databaseContextMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  // Never write one-time authentication credentials to application logs.
  const path = req.path.replace(
    /^\/api\/auth\/magic-link\/[a-f0-9]{64}$/i,
    "/api/auth/magic-link/[REDACTED]",
  );
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  const originalResSend = res.send;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    const serialized = JSON.stringify(bodyJson);
    if (serialized === undefined) {
      return originalResJson.apply(res, [bodyJson, ...args]);
    }

    // Cloudflare's experimental Node HTTP bridge can drop the final byte of a
    // completed response stream. A trailing newline is valid JSON whitespace
    // and acts as a transport terminator so the actual closing } or ] remains
    // intact. The Worker entrypoint buffers and reframes JSON responses before
    // returning them to the browser.
    res.type("application/json");
    return originalResSend.call(res, `${serialized}\n`);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(JSON.stringify({
      message: "Unhandled Express error",
      error: err instanceof Error ? err.message : String(err),
      status,
    }));
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
}
