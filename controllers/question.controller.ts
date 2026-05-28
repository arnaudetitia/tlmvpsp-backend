import database = require("../database");

export class QuestionController {
  public async getAllQuestions() {
    const pool = database.Database.getPool();
    const result = await pool.query(
      `
    SELECT 
	    q.id,
	    CASE 
	    	WHEN t.id in (SELECT id FROM tlmvpsp.themes_compet ) THEN 'COMPET'
	    	WHEN t.id in (SELECT id FROM tlmvpsp.themes_defi ) THEN 'DEFI'
	    	ELSE 'QUALIFS'
	    END as manche_question,
	    t.libelle as libelle_theme,
	    qt.ordre,
	    q.question,
	    q.bonne_reponse, 
	    q.mauvaises_reponses,
	    q.tri,
	    qca.aliases,
	    mq.musique,
	    mq.jouee_apres_question
    FROM     
    	tlmvpsp.questions q
    	LEFT JOIN tlmvpsp.question_theme qt ON q.id = qt.id_question
    	LEFT JOIN tlmvpsp.theme t on qt.id_theme = t.id
    	LEFT JOIN tlmvpsp.musiques_question mq on q.id = mq.id_question
    	LEFT JOIN tlmvpsp.question_cash_aliases qca on q.id = qca.id_question
    ORDER BY q.id
    `,
    );
    return result.rows;
  }
}
