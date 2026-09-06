import database = require("../database");

export class CompetController {
  public async setJoueursCompet(joueursCompet: string[]) {
    const pool = database.Database.getPool();

    try {
      await pool.query("BEGIN");
      await pool.query("DELETE FROM tlmvpsp.joueurs_compet;");

      for (const joueur of joueursCompet) {
        await pool.query({
          text: `INSERT INTO tlmvpsp.joueurs_compet(nom_joueur)
      VALUES ($1)`,
          values: [joueur],
        });
      }
      await pool.query("COMMIT");
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
  }

  public async getJoueursCompet() {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT jc.* FROM tlmvpsp.joueurs_compet jc`,
    });
    return result.rows;
  }

  public async connectJoueur(nomJoueur: string) {
    const pool = database.Database.getPool();
    await pool.query({
      text: `UPDATE tlmvpsp.joueurs_compet
            SET connected = TRUE
            WHERE nom_joueur = $1`,
      values: [nomJoueur],
    });
  }

  public async deconnectJoueur(nomJoueur: string) {
    const pool = database.Database.getPool();
    await pool.query({
      text: `UPDATE tlmvpsp.joueurs_compet
            SET connected = FALSE
            WHERE nom_joueur = $1`,
      values: [nomJoueur],
    });
  }

  public async getCompetByTheme(idPartie: number) {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT 
              q.question, 
              q.bonne_reponse, 
              q.mauvaises_reponses,
              q.tri, 
              t.libelle as libelle_theme, 
              qt.ordre, 
              qca.aliases, 
              mq.musique, 
              mq.jouee_apres_question 
            FROM tlmvpsp.questions q
            JOIN tlmvpsp.question_theme qt on q.id = qt.id_question
            JOIN tlmvpsp.theme t on qt.id_theme = t.id
            LEFT JOIN tlmvpsp.musiques_question mq on q.id = mq.id_question
            LEFT JOIN tlmvpsp.question_cash_aliases qca on qt.id_question = qca.id_question
            WHERE qt.id_theme = (SELECT id_theme_compet FROM tlmvpsp.parties WHERE id = $1 )
            ORDER BY qt.ordre`,
      values: [idPartie],
    });
    return result.rows;
  }

  public async getCurrentQuestion() {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT qcd.question, qcd.reponse_display FROM tlmvpsp.question_compet_display qcd`,
    });
    return result.rows;
  }

  public async setCurrentQuestion(question: string, reponseDisplay: string[]) {
    const pool = database.Database.getPool();
    try {
      await pool.query("BEGIN");
      await pool.query("DELETE FROM tlmvpsp.question_compet_display");
      await pool.query({
        text: `INSERT INTO tlmvpsp.question_compet_display(etat, question, reponse_display) 
      VALUES (0, $1, $2)`,
        values: [question, reponseDisplay],
      });
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  public async openVotes() {
    const pool = database.Database.getPool();
    await pool.query({
      text: `UPDATE tlmvpsp.question_compet_display
            SET etat = 1`,
    });
  }

  public async envoyerReponse(joueur: string, reponse: string) {
    const pool = database.Database.getPool();
    await pool.query({
      text: `UPDATE tlmvpsp.joueurs_compet
            SET reponse_donnee = $2
            WHERE nom_joueur = $1`,
      values: [joueur, reponse],
    });
  }
}
