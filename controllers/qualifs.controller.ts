import database = require("../database");

export class QualifsController {
  public async getQualifs() {
    const pool = database.Database.getPool();
    const result = await pool.query(
      `SELECT * FROM tlmvpsp.questions
       WHERE id IN (SELECT unnest(id_question) FROM tlmvpsp.partie_config WHERE en_cours IS TRUE)
       ORDER BY id`,
    );
    return result.rows;
  }
}
