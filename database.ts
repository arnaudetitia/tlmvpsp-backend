import { Pool } from "pg";
import dotenv from "dotenv";

export class Database {
  private static pool: Pool;

  public static getPool(): Pool {
    dotenv.config({
      path: `environments/environment.${process.env.NODE_ENV}`,
    });
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.NODE_ENV === "prod"
            ? { rejectUnauthorized: false }
            : false,
      });
      console.log("🐘 Connexion à PostgreSQL établie");
    }
    return this.pool;
  }
}
