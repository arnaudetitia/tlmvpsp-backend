import database = require("../database");

export class DefiController {
  public async getLibelleThemes(idPartie: number) {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT t.id as idTheme , t.libelle as libelleTheme
            FROM tlmvpsp.theme t
            WHERE t.id IN (SELECT UNNEST(ids_themes_defi) FROM tlmvpsp.parties WHERE id = $1)`,
      values: [idPartie],
    });
    return result.rows;
  }

  public async getQuestionTheme(idTheme: number) {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT 
              q.question, 
              q.bonne_reponse, 
              q.mauvaises_reponses, 
              q.tri, 
              t.libelle as libelle_theme, 
              qt.ordre 
            FROM tlmvpsp.questions q
            JOIN tlmvpsp.question_theme qt ON q.id = qt.id_question
            JOIN tlmvpsp.theme t ON qt.id_theme = t.id
            WHERE t.id = $1
            ORDER BY qt.ordre`,
      values: [idTheme],
    });
    return result.rows;
  }

  public async getChampion(idPartie: number) {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT c.nom_champion FROM tlmvpsp.champion c
      JOIN tlmvpsp.parties p ON c.id = p.id_champion
      WHERE p.id = $1`,
      values: [idPartie],
    });
    return result.rows[0];
  }

  public async putChampion(idPartie: number, newChampion: string) {
    const pool = database.Database.getPool();
    await pool.query({
      text: `UPDATE tlmvpsp.champion
            SET nom_champion = $1
            WHERE id IN (SELECT id_champion FROM tlmvpsp.parties p WHERE p.id = $2 ) `,
      values: [newChampion, idPartie],
    });
  }
}
