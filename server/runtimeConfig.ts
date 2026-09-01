import type { Request } from "express";

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getAppUrl(req?: Pick<Request, "protocol" | "get">): string {
  if (process.env.APP_URL) return normalizeUrl(process.env.APP_URL);

  if (req) {
    const host = req.get("host");
    if (host) return `${req.protocol}://${host}`;
  }

  return "http://localhost:5000";
}
