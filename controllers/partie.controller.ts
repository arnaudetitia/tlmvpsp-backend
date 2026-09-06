import { QueryConfig } from "pg";
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
            SELECT JSON_AGG(JSON_BUILD_OBJECT('idQuestion',q.id,'question', q.question, 'bonneReponse', q.bonne_reponse))
            FROM tlmvpsp.questions q
            WHERE q.id = ANY(p.ids_questions_qualif)
        ) AS questions_qualifs,
        tc.id AS id_compet,
        tc.libelle AS theme_compet,
        (
            SELECT JSON_AGG(JSON_BUILD_OBJECT('idTheme', td.id, 'libelleTheme', td.libelle))
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

  public async createNouvellePartie(
    nomPartie: string,
    idsQuestionsQualif: number[],
    idThemeCompet: number,
    idsThemesDefi: number[],
    idChampion: number,
  ) {
    const pool = database.Database.getPool();
    await pool.query({
      text: `
      INSERT INTO tlmvpsp.parties(nom_partie, ids_questions_qualif, id_theme_compet, ids_themes_defi, id_champion, code_champion )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      values: [
        nomPartie,
        idsQuestionsQualif,
        idThemeCompet,
        idsThemesDefi,
        idChampion,
        this.getNewCodeChampion(),
      ],
    });
  }

  public async flagPartieEncours(flag: boolean, idPartie?: number) {
    const pool = database.Database.getPool();
    let query = {} as QueryConfig;
    if (flag) {
      query = {
        text: `
      UPDATE tlmvpsp.parties
      SET en_cours = TRUE
      WHERE id = $1
      `,
        values: [idPartie],
      };
    } else {
      query = {
        text: `
          UPDATE tlmvpsp.parties
          SET en_cours = FALSE
          WHERE en_cours = TRUE
        `,
      };
    }

    await pool.query(query);
  }

  public async getCodeChampionForCurrentPartie() {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `
        SELECT code_champion
        FROM tlmvpsp.parties
        WHERE en_cours IS TRUE
      `,
    });

    return result.rows ? result.rows[0]["code_champion"] : null;
  }

  getNewCodeChampion() {
    let code = "";

    const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (let i = 0; i < 12; i++) {
      code += allChars.charAt(Math.random() * allChars.length);
    }

    return code;
  }
}
