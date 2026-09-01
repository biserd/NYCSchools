import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import * as schema from "@shared/schema";

function requireConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL must be set directly or initialized from the Hyperdrive binding.",
    );
  }
  return connectionString;
}

function createDatabase(client: Client | Pool) {
  return drizzle({ client, schema });
}

export type Database = ReturnType<typeof createDatabase>;

interface RequestDatabaseContext {
  client: Client;
  database: Database;
}

const requestDatabase = new AsyncLocalStorage<RequestDatabaseContext>();

let fallbackPool: Pool | undefined;
let fallbackDatabase: Database | undefined;

function getFallbackDatabase(): Database {
  if (!fallbackPool || !fallbackDatabase) {
    fallbackPool = new Pool({
      connectionString: requireConnectionString(),
      max: 2,
    });
    fallbackDatabase = createDatabase(fallbackPool);
  }
  return fallbackDatabase;
}

function getActiveDatabase(): Database {
  return requestDatabase.getStore()?.database ?? getFallbackDatabase();
}

// Existing storage modules import `db` directly. The proxy preserves that API
// while resolving every operation against the current request's Hyperdrive
// client. CLI/import scripts fall back to a small Node.js pool.
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getActiveDatabase();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});

export async function withDatabaseConnection<T>(
  callback: () => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: requireConnectionString() });
  await client.connect();

  try {
    return await requestDatabase.run(
      { client, database: createDatabase(client) },
      callback,
    );
  } finally {
    await client.end();
  }
}

export function databaseContextMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const client = new Client({ connectionString: requireConnectionString() });

  void client.connect().then(() => {
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      void client.end().catch((error) => {
        console.error(JSON.stringify({
          message: "Failed to close PostgreSQL request connection",
          error: error instanceof Error ? error.message : String(error),
        }));
      });
    };

    res.once("finish", close);
    res.once("close", close);

    requestDatabase.run(
      { client, database: createDatabase(client) },
      next,
    );
  }).catch(next);
}
