import database = require("../database");

export class PartieController {
  public async getAllParties() {
    const pool = database.Database.getPool();
    const result = await pool.query(
      `SELECT 
        p.id,
        p.nom_partie,
        champ.nom_lignee,
        champ.nom_champion,
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
            JOIN tlmvpsp.champion champ ON p.id_champion = champ.id
            ORDER BY p.id;
         `,
    );
    return result.rows;
  }

  public async getAllLigneesChampion() {
    const pool = database.Database.getPool();
    const result = await pool.query(
      `
      SELECT id, nom_lignee, nom_champion
      FROM tlmvpsp.champion
      ORDER BY id
      `,
    );
    return result.rows;
  }

  public async getAllQuestionsQualifs() {
    const pool = database.Database.getPool();
    const result = await pool.query(
      `
      SELECT id, question, bonne_reponse
      FROM tlmvpsp.questions_qualifs
      ORDER BY id
      `,
    );
    return result.rows;
  }

  public async getAllThemesCompet() {
    const pool = database.Database.getPool();
    const result = await pool.query(
      `
      SELECT id, libelle
      FROM tlmvpsp.themes_compet
      ORDER BY id
      `,
    );
    return result.rows;
  }

  public async getAllThemesDefi() {
    const pool = database.Database.getPool();
    const result = await pool.query(
      `
      SELECT id, libelle
      FROM tlmvpsp.themes_defi
      ORDER BY id
      `,
    );
    return result.rows;
  }
}
