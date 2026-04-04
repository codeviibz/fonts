import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super("DATABASE_URL environment variable is required");
    this.name = "MissingDatabaseUrlError";
  }
}

function getPool(): Pool {
  if (global._pgPool) return global._pgPool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new MissingDatabaseUrlError();
  }

  const p = new Pool({
    connectionString: url,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  if (process.env.NODE_ENV !== "production") {
    global._pgPool = p;
  }
  return p;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const realPool = getPool();
    const value = Reflect.get(realPool, prop, receiver);
    return typeof value === "function" ? value.bind(realPool) : value;
  },
});
