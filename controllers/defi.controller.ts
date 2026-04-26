import database = require("../database");

export class DefiController {
  public async getLibelleThemes() {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT t.id as idTheme , t.libelle as libelleTheme
            FROM tlmvpsp.theme t
            WHERE t.id IN (SELECT UNNEST(id_themes_defi) FROM tlmvpsp.partie_config WHERE en_cours IS TRUE)`,
    });
    return result.rows;
  }

  public async getQuestionTheme(idTheme: number) {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT q.*, t.libelle as libelle_theme, qt.ordre FROM tlmvpsp.questions q
            JOIN tlmvpsp.question_theme qt ON q.id = qt.id_question
            JOIN tlmvpsp.theme t ON qt.id_theme = t.id
            WHERE t.id = $1
            ORDER BY qt.ordre`,
      values: [idTheme],
    });
    return result.rows;
  }

  public async getChampion() {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT c.nom_champion FROM tlmvpsp.champion c`,
    });
    return result.rows[0];
  }

  public async putChampion(newChampion: string) {
    const pool = database.Database.getPool();
    await pool.query({
      text: `UPDATE tlmvpsp.champion
            SET nom_champion = $1`,
      values: [newChampion],
    });
  }
}
