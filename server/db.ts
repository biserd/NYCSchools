import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import { drizzle } from 'drizzle-orm/d1';
import type { SQL } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as schema from '@shared/schema';

type AsyncDatabase = BaseSQLiteDatabase<'async', unknown, typeof schema>;
export function wrapDatabase(database: AsyncDatabase) {
  // Preserve the raw-query result contract. SQL is SQLite, not translated PG.
  return Object.assign(database, {
    async execute<T extends Record<string, unknown> = Record<string, unknown>>(query: SQL) {
      return { rows: await database.all<T>(query) };
    },
  });
}
export function createDatabase(binding: D1Database) {
  return wrapDatabase(drizzle(binding, { schema }));
}
export type Database = ReturnType<typeof wrapDatabase>;
const requestDatabase = new AsyncLocalStorage<Database>();
export function withDatabaseInstance<T>(database: Database, callback: () => Promise<T>): Promise<T> {
  return requestDatabase.run(database, callback);
}
function getActiveDatabase(): Database {
  const database = requestDatabase.getStore();
  if (!database) throw new Error('D1 operation outside database request context');
  return database;
}
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getActiveDatabase();
    const value = Reflect.get(database, property, database);
    return typeof value === 'function' ? value.bind(database) : value;
  },
});
export async function withDatabaseConnection<T>(callback: () => Promise<T>): Promise<T> {
  if (requestDatabase.getStore()) return callback();
  const { env } = await import('cloudflare:workers');
  return requestDatabase.run(createDatabase(env.DB), callback);
}
export function databaseContextMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  void withDatabaseConnection(async () => next()).catch(next);
}
