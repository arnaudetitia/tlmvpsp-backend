import database = require("../database");

export class QualifsController {
  public async getQualifs(idPartie: number) {
    const pool = database.Database.getPool();
    const result = await pool.query({
      text: `
      WITH musiques_question_table AS 
        (SELECT * FROM tlmvpsp.musiques_question mq 
        WHERE mq.jouee_apres_question IS FALSE),
      musiques_reponse_table AS 
        (SELECT * FROM tlmvpsp.musiques_question mq 
        WHERE mq.jouee_apres_question IS TRUE)
      SELECT 
        q.question, 
        q.bonne_reponse, 
        q.mauvaises_reponses, 
        q.tri, 
        mq.musique as musique_question, 
        mr.musique as musique_reponse
       FROM tlmvpsp.questions q
       LEFT JOIN musiques_question_table mq ON q.id = mq.id_question
       LEFT JOIN musiques_reponse_table mr ON q.id = mr.id_question
       WHERE id IN (SELECT unnest(ids_questions_qualif) FROM tlmvpsp.parties WHERE id = $1)
       ORDER BY id`,
      values: [idPartie],
    });
    return result.rows;
  }
}
