import { Pool } from "pg";

export class Database {
  private static pool: Pool;

  public static getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        user: "postgres",
        host: "localhost",
        database: "tlmvpsp_db",
        password: "admin",
        max: 20,
        port: 5432,
      });
      console.log("🐘 Connexion à PostgreSQL établie");
    }
    return this.pool;
  }
}
