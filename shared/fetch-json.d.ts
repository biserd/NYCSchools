// The application validates API payloads at their usage sites and historically
// relies on the browser Fetch API's `json(): Promise<any>` signature. Node's
// Undici declarations narrow that method to `unknown`; keep one consistent
// signature across the client, Node tooling, and Workers runtime.
declare global {
  interface Body {
    json(): Promise<any>;
  }
}

declare module "undici-types" {
  interface BodyMixin {
    json(): Promise<any>;
  }
}

export {};
