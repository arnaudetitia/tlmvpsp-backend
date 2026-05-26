import database = require("../database");

export class QualifsController {
  public async getQualifs(idPartie: number) {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `SELECT 
        q.question, 
        q.bonne_reponse, 
        q.mauvaises_reponses, 
        q.tri, 
        mq.musique, 
        mq.jouee_apres_question 
       FROM tlmvpsp.questions q
       LEFT JOIN tlmvpsp.musiques_question mq ON q.id = mq.id_question
       WHERE id IN (SELECT unnest(ids_questions_qualif) FROM tlmvpsp.parties WHERE id = $1)
       ORDER BY id`,
      values: [idPartie],
    });
    return result.rows;
  }
}
