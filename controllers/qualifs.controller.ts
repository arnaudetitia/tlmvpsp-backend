import database = require("../database");

export class QualifsController {
  public async getQualifs() {
    const pool = database.Database.getPool();
    const result = await pool.query(
      `SELECT 
        q.question, 
        q.bonne_reponse, 
        q.mauvaises_reponses, 
        q.tri, 
        mq.musique, 
        mq.jouee_apres_question 
       FROM tlmvpsp.questions q
       LEFT JOIN tlmvpsp.musiques_question mq ON q.id = mq.id_question
       WHERE id IN (SELECT unnest(id_question) FROM tlmvpsp.partie_config WHERE en_cours IS TRUE)
       ORDER BY id`,
    );
    return result.rows;
  }
}
