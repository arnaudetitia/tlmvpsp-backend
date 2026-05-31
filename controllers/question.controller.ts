import database = require("../database");
import { QuestionVo } from "../models/question.model";

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
		t.id as id_theme,
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

  public async updateQuestion(idQuestion: number, question: QuestionVo) {
    const pool = database.Database.getPool();
    await pool.query("BEGIN");
    try {
      await pool.query({
        text: `
		UPDATE tlmvpsp.questions
		SET question = $2,
		bonne_reponse = $3,
		mauvaises_reponses = $4,
		tri = $5
		WHERE id = $1
		`,
        values: [
          idQuestion,
          question.question,
          question.bonneReponse,
          question.mauvaisesReponses,
          question.tri,
        ],
      });

      if (question.musique) {
        await pool.query({
          text: `
		INSERT INTO tlmvpsp.musiques_question(id_question, musique, jouee_apres_question)
		VALUES ($1, $2, $3)
		ON CONFLICT (id_question)
		DO UPDATE SET
		musique = EXCLUDED.musique,
		jouee_apres_question = EXCLUDED.jouee_apres_question
		`,
          values: [idQuestion, question.musique, question.joueeApresQuestion],
        });
      } else {
        await pool.query({
          text: `
        DELETE FROM  tlmvpsp.musiques_question
        WHERE id_question = $1
        `,
          values: [idQuestion],
        });
      }

      if (question.aliases && question.aliases.length > 0) {
        await pool.query({
          text: `
        INSERT INTO tlmvpsp.question_cash_aliases(id_question, aliases)
        VALUES ($1, $2)
        ON CONFLICT (id_question)
        DO UPDATE SET
        aliases = EXCLUDED.aliases
        `,
          values: [idQuestion, question.aliases],
        });
      } else {
        await pool.query({
          text: `
        DELETE FROM  tlmvpsp.question_cash_aliases
        WHERE id_question = $1
        `,
          values: [idQuestion],
        });
      }
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}
