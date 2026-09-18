import { Router, type Request, type RequestHandler } from "express";
import { ZodError } from "zod";
import { addChild, addEvent, createHousehold, getOverview, removeChild, removeEvent, TuckError } from "./store";

function userId(req: Request): string {
  if (!req.session?.userId) throw new TuckError(401, "Sign in to use Tuck.");
  return req.session.userId;
}

export function tuckRouter(authenticate: RequestHandler, appOrigin: () => string) {
  const router = Router();
  router.use((req, res, next) => {
    res.set({ "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" });
    const origin = req.get("origin");
    const mutation = !["GET", "HEAD"].includes(req.method);
    if ((origin && origin !== new URL(appOrigin()).origin) || req.get("sec-fetch-site") === "cross-site" || (mutation && !origin)) {
      return res.status(403).json({ message: "Use Tuck from your NYC School Ratings account." });
    }
    next();
  });
  router.use(authenticate);
  router.get("/overview", async (req, res) => res.json(await getOverview(userId(req))));
  router.post("/household", async (req, res) => res.json(await createHousehold(userId(req))));
  router.post("/children", async (req, res) => res.status(201).json(await addChild(userId(req), req.body)));
  router.post("/events", async (req, res) => res.status(201).json(await addEvent(userId(req), req.body)));
  router.delete("/events/:id", async (req, res) => { await removeEvent(userId(req), req.params.id); res.sendStatus(204); });
  router.delete("/children/:id", async (req, res) => { await removeChild(userId(req), req.params.id); res.sendStatus(204); });
  router.use((error: unknown, _req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    if (error instanceof ZodError) return res.status(400).json({ message: "Check the supplied fields.", fields: error.flatten().fieldErrors });
    if (error instanceof TuckError) return res.status(error.status).json({ message: error.message });
    next(error);
  });
  return router;
}
