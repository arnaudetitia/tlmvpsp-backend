import database = require("../database");

export class PartieController {
  public async getAllParties() {
    const pool = database.Database.getPool();
    const result = await pool.query(
      `SELECT 
        p.id,
        p.nom_partie,
        (
            SELECT JSON_AGG(JSON_BUILD_OBJECT('question', q.question, 'bonneReponse', q.bonne_reponse))
            FROM tlmvpsp.questions q
            WHERE q.id = ANY(p.ids_questions_qualif)
        ) AS questions_qualifs,
        tc.libelle AS theme_compet,
        (
            SELECT ARRAY_AGG(td.libelle)
            FROM tlmvpsp.themes_defi td
            WHERE td.id = ANY(p.ids_themes_defi)
        ) AS themes_defi
            FROM tlmvpsp.parties p
            JOIN tlmvpsp.themes_compet tc ON p.id_theme_compet = tc.id
            ORDER BY p.id;
         `,
    );
    return result.rows;
  }
}
