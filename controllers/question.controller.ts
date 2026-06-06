import database = require("../database");
import { QuestionVo } from "../models/question.model";
import { CsvReaderUtil } from "../utils/csv-reader.util";
import { TriTypeEnum } from "../models/enum/tri.enum";
import { ErreurImportFichier } from "../models/erreur-import-fichier.model";
import format from "pg-format";
import {
  CSVCompetColumns,
  CSVDefiColumns,
  CSVQualifsColumns,
} from "../models/enum/csv-columns.enum";

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

  public async createQuestion(question: any) {
    const pool = database.Database.getPool();
    await pool.query("BEGIN");
    try {
      const result = await pool.query({
        text: `
        INSERT INTO tlmvpsp.questions(question, bonne_reponse, mauvaises_reponses, tri)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        values: [
          question.question,
          question.bonneReponse,
          question.mauvaisesReponses,
          question.tri,
        ],
      });
      const idQuestion = result.rows[0].id;
      if (question.musique) {
        await pool.query({
          text: `
		      INSERT INTO tlmvpsp.musiques_question(id_question, musique, jouee_apres_question)
		      VALUES ($1, $2, $3)
		      `,
          values: [idQuestion, question.musique, question.joueeApresQuestion],
        });
      }
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
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

  public async importQuestionsQualifs(csvContent: string, doImport: boolean) {
    const records = await CsvReaderUtil.parseRecords(csvContent);
    const erreurs: ErreurImportFichier[] = [];

    records.forEach((record, index) => {
      if (!record[CSVQualifsColumns.QUESTION]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "question" manquant',
        });
      }
      if (!record[CSVQualifsColumns.BONNE_REPONSE]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "bonneReponse" manquant',
        });
      }
      if (
        !record[CSVQualifsColumns.MAUVAISE_REPONSE_1] ||
        !record[CSVQualifsColumns.MAUVAISE_REPONSE_2] ||
        !record[CSVQualifsColumns.MAUVAISE_REPONSE_3]
      ) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "mauvaisesReponses" manquant',
        });
      }
      if (!record[CSVQualifsColumns.TRI]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "tri" manquant',
        });
      }
      const triTypeEnumValues = Object.values(TriTypeEnum);
      if (!triTypeEnumValues.includes(record[CSVQualifsColumns.TRI])) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: `Valeur du champ "tri" invalide (doit être l'une des suivantes : ${triTypeEnumValues.join(", ")})`,
        });
      }
    });
    if (doImport && erreurs.length === 0) {
      const questionVoList: QuestionVo[] = records.map((record: string[]) => {
        return {
          question: record[CSVQualifsColumns.QUESTION],
          bonneReponse: record[CSVQualifsColumns.BONNE_REPONSE],
          mauvaisesReponses: record.slice(
            CSVQualifsColumns.MAUVAISE_REPONSE_1,
            CSVQualifsColumns.MAUVAISE_REPONSE_3 + 1,
          ),
          tri: record[CSVQualifsColumns.TRI],
        } as QuestionVo;
      });
      console.log(questionVoList);
      await this.createQuestionsFromImport(questionVoList);
    }
    return erreurs;
  }

  public async importQuestionsCompet(csvContent: string, doImport: boolean) {
    const records = await CsvReaderUtil.parseRecords(csvContent);
    const erreurs: ErreurImportFichier[] = [];
    records.forEach((record, index) => {
      if (!record[CSVCompetColumns.THEME]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "thème" manquant',
        });
      }
      if (!record[CSVCompetColumns.ORDRE]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "ordre" manquant',
        });
      }
      if (!record[CSVCompetColumns.QUESTION]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "question" manquant',
        });
      }
      if (!record[CSVCompetColumns.BONNE_REPONSE]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "bonneReponse" manquant',
        });
      }
      [1, 2, 3].forEach((ordreQuestion) => {
        if (record[CSVCompetColumns.ORDRE] === ordreQuestion) {
          if (!record[CSVCompetColumns.MAUVAISE_REPONSE_1]) {
            erreurs.push({
              ligne: index + 1,
              type: "error",
              message: `Champ "mauvaisesReponses" manquant pour la question d'ordre ${ordreQuestion}`,
            });
          }
          if (
            record[CSVCompetColumns.MAUVAISE_REPONSE_2] ||
            record[CSVCompetColumns.MAUVAISE_REPONSE_3]
          ) {
            erreurs.push({
              ligne: index + 1,
              type: "warning",
              message: `Des champs de mauvaises réponses sont renseignés pour la question d'ordre ${ordreQuestion}, alors qu'ils ne devraient pas l'être (seule une mauvaise réponse est attendue pour les questions d'ordre 1 à 3)`,
            });
          }
        }
      });
      [4, 5, 6].forEach((ordreQuestion) => {
        if (record[CSVCompetColumns.ORDRE] === ordreQuestion) {
          if (
            !record[CSVCompetColumns.MAUVAISE_REPONSE_1] ||
            !record[CSVCompetColumns.MAUVAISE_REPONSE_2] ||
            !record[CSVCompetColumns.MAUVAISE_REPONSE_3]
          ) {
            erreurs.push({
              ligne: index + 1,
              type: "error",
              message: `Champ "mauvaisesReponses" manquant pour la question d'ordre ${ordreQuestion}`,
            });
          }
        }
      });
      [7, 8, 9, 10, 11, 12].forEach((ordreQuestion) => {
        if (record[CSVCompetColumns.ORDRE] === ordreQuestion) {
          if (
            record[CSVCompetColumns.MAUVAISE_REPONSE_1] ||
            record[CSVCompetColumns.MAUVAISE_REPONSE_2] ||
            record[CSVCompetColumns.MAUVAISE_REPONSE_3]
          ) {
            erreurs.push({
              ligne: index + 1,
              type: "warning",
              message: `Des champs de mauvaises réponses sont renseignés pour la question d'ordre ${ordreQuestion}, alors qu'ils ne devraient pas l'être (aucune mauvaise réponse n'est attendue pour les questions d'ordre 7 à 12)`,
            });
          }
        }
      });

      if (!record[CSVCompetColumns.TRI]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "tri" manquant',
        });
      }
      const triTypeEnumValues = Object.values(TriTypeEnum);
      if (!triTypeEnumValues.includes(record[CSVCompetColumns.TRI])) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: `Valeur du champ "tri" invalide (doit être l'une des suivantes : ${triTypeEnumValues.join(", ")})`,
        });
      }
      if (
        ![7.8].includes(record[CSVCompetColumns.ORDRE]) &&
        record[CSVCompetColumns.ALIASES]
      ) {
        erreurs.push({
          ligne: index + 1,
          type: "warning",
          message:
            'Le champ "aliases" ne doit être renseigné que pour les questions d\'ordre 7 ou 8',
        });
      }
    });
    // on regroupe les questions par thème pour vérifier qu'on a bien 12 questions par thème, avec un ordre de 1 à 12 sans trou
    let competMap: Map<string, string[][]> = records.reduce((acc, record) => {
      const theme = record[CSVCompetColumns.THEME];
      if (!acc.has(theme)) {
        acc.set(theme, []);
      }
      acc.get(theme)!.push(record);
      return acc;
    }, new Map<string, string[][]>());
    competMap.forEach((questions, theme) => {
      if (questions.length !== 12) {
        erreurs.push({
          ligne: 0,
          type: "error",
          message: `Le thème de compétition "${theme}" doit contenir exactement 12 questions (en contient ${questions.length})`,
        });
      }
    });
    competMap.forEach((questions, theme) => {
      const ordreSet = new Set(questions.map((q) => q[1]));
      const ordresManquants = [];
      for (let i = 1; i <= 12; i++) {
        if (!ordreSet.has(i.toString())) {
          ordresManquants.push(i);
        }
      }
      if (ordresManquants.length > 0) {
        erreurs.push({
          ligne: 0,
          type: "error",
          message: `Le thème de compétition "${theme}" doit contenir une question pour chaque ordre de 1 à 12 (ordres manquants : ${ordresManquants.join(", ")})`,
        });
      } else {
        competMap.set(
          theme,
          questions.sort((a, b) => parseInt(a[1]) - parseInt(b[1])),
        );
      }
    });
    if (doImport && erreurs.length === 0) {
      // A ce stade, les thèmes de compétition sont regroupés par thème et triés par ordre
      // on va importer les question thème par thème
      for (const [theme, questions] of competMap.entries()) {
        const questionVoList: QuestionVo[] = questions.map(
          (record: string[]) => {
            return {
              question: record[CSVCompetColumns.QUESTION],
              bonneReponse: record[CSVCompetColumns.BONNE_REPONSE],
              mauvaisesReponses: record.slice(
                CSVCompetColumns.MAUVAISE_REPONSE_1,
                CSVCompetColumns.MAUVAISE_REPONSE_3 + 1,
              ),
              tri: record[CSVCompetColumns.TRI],
              aliases: record[CSVCompetColumns.ALIASES]
                ? record[CSVCompetColumns.ALIASES]
                    .split(",")
                    .map((alias) => alias.trim())
                : [],
            } as QuestionVo;
          },
        );
        await this.createCompetFromImport(theme, questionVoList);
      }
    }
    return erreurs;
  }

  public async importQuestionsDefi(csvContent: string, doImport: boolean) {
    const records = await CsvReaderUtil.parseRecords(csvContent);
    const erreurs: ErreurImportFichier[] = [];

    records.forEach((record, index) => {
      if (!record[CSVDefiColumns.THEME]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "thème" manquant',
        });
      }
      if (!record[CSVDefiColumns.ORDRE]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "ordre" manquant',
        });
      }
      if (!record[CSVDefiColumns.QUESTION]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "question" manquant',
        });
      }
      if (!record[CSVDefiColumns.BONNE_REPONSE]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "bonneReponse" manquant',
        });
      }
      if (
        !record[CSVDefiColumns.MAUVAISE_REPONSE_1] ||
        !record[CSVDefiColumns.MAUVAISE_REPONSE_2] ||
        !record[CSVDefiColumns.MAUVAISE_REPONSE_3]
      ) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "mauvaisesReponses" manquant',
        });
      }
      if (!record[CSVDefiColumns.TRI]) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: 'Champ "tri" manquant',
        });
      }
      const triTypeEnumValues = Object.values(TriTypeEnum);
      if (!triTypeEnumValues.includes(record[CSVDefiColumns.TRI])) {
        erreurs.push({
          ligne: index + 1,
          type: "error",
          message: `Valeur du champ "tri" invalide (doit être l'une des suivantes : ${triTypeEnumValues.join(", ")})`,
        });
      }
    });
    let defiMap: Map<string, string[][]> = records.reduce((acc, record) => {
      const theme = record[CSVDefiColumns.THEME];
      if (!acc.has(theme)) {
        acc.set(theme, []);
      }
      acc.get(theme)!.push(record);
      return acc;
    }, new Map<string, string[][]>());
    defiMap.forEach((questions, theme) => {
      if (questions.length !== 6) {
        erreurs.push({
          ligne: 0,
          type: "error",
          message: `Le défi "${theme}" doit contenir exactement 6 questions (en contient ${questions.length})`,
        });
      }
    });
    defiMap.forEach((questions, theme) => {
      const ordreSet = new Set(questions.map((q) => q[1]));
      const ordresManquants = [];
      for (let i = 1; i <= 6; i++) {
        if (!ordreSet.has(i.toString())) {
          ordresManquants.push(i);
        }
      }
      if (ordresManquants.length > 0) {
        erreurs.push({
          ligne: 0,
          type: "error",
          message: `Le défi "${theme}" doit contenir une question pour chaque ordre de 1 à 6 (ordres manquants : ${ordresManquants.join(", ")})`,
        });
      } else {
        defiMap.set(
          theme,
          questions.sort((a, b) => parseInt(a[1]) - parseInt(b[1])),
        );
      }
    });
    if (doImport && erreurs.length === 0) {
      // A ce stade, les défis sont regroupés par thème et triés par ordre
      // on va importer les question thème par thème
      for (const [theme, questions] of defiMap.entries()) {
        const questionVoList: QuestionVo[] = questions.map(
          (record: string[]) => {
            return {
              question: record[CSVDefiColumns.QUESTION],
              bonneReponse: record[CSVDefiColumns.BONNE_REPONSE],
              mauvaisesReponses: record.slice(
                CSVDefiColumns.MAUVAISE_REPONSE_1,
                CSVDefiColumns.MAUVAISE_REPONSE_3 + 1,
              ),
              tri: record[CSVDefiColumns.TRI],
            } as QuestionVo;
          },
        );
        await this.createDefiFromImport(theme, questionVoList);
      }
    }
    return erreurs;
  }

  private async createCompetFromImport(
    theme: string,
    questionVoList: QuestionVo[],
  ) {
    const pool = database.Database.getPool();
    try {
      await pool.query("BEGIN");
      // On insère d'abord le thème de compétition
      const themeId = (
        await pool.query(
          `
        INSERT INTO tlmvpsp.themes(libelle)
        VALUES ($1) RETURNING id
        `,
          [theme],
        )
      ).rows[0].id;

      for (const [indexQuestion, questionVo] of questionVoList.entries()) {
        const result = await pool.query(
          `
          INSERT INTO tlmvpsp.questions(question, bonne_reponse, mauvaises_reponses, tri)
          VALUES ($1, $2, $3, $4)
          RETURNING id
          `,
          [
            questionVo.question,
            questionVo.bonneReponse,
            questionVo.mauvaisesReponses,
            questionVo.tri,
          ],
        );

        const questionId = result.rows[0].id;

        if (questionVo.aliases && questionVo.aliases.length > 0) {
          await pool.query(
            `
            INSERT INTO tlmvpsp.question_cash_aliases(id_question, aliases)
            VALUES ($1, $2)
            `,
            [questionId, questionVo.aliases],
          );
        }

        await pool.query(
          `
          INSERT INTO tlmvpsp.question_theme(id_question, id_theme, ordre)
          VALUES ($1, $2, $3)
          `,
          [questionId, themeId, indexQuestion + 1],
        );
      }
      await pool.query("REFRESH MATERIALIZED VIEW tlmvpsp.themes_compet");
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  private async createQuestionsFromImport(questionVoList: QuestionVo[]) {
    const pool = database.Database.getPool();
    for (let question of questionVoList) {
      await pool.query({
        text: `
      INSERT INTO tlmvpsp.questions(question, bonne_reponse, mauvaises_reponses, tri)
      VALUES ($1, $2, $3, $4 )
      `,
        values: [
          question.question,
          question.bonneReponse,
          question.mauvaisesReponses,
          question.tri,
        ],
      });
    }

    await pool.query("REFRESH MATERIALIZED VIEW tlmvpsp.questions_qualifs");
  }

  private async createDefiFromImport(
    theme: string,
    questionVoList: QuestionVo[],
  ) {
    const pool = database.Database.getPool();
    try {
      await pool.query("BEGIN");
      // On insère d'abord le thème du défi
      const themeId = (
        await pool.query(
          `
        INSERT INTO tlmvpsp.theme(libelle)
        VALUES ($1) RETURNING id
        `,
          [theme],
        )
      ).rows[0].id;

      for (const [indexQuestion, questionVo] of questionVoList.entries()) {
        const result = await pool.query(
          `
          INSERT INTO tlmvpsp.questions(question, bonne_reponse, mauvaises_reponses, tri)
          VALUES ($1, $2, $3, $4)
          RETURNING id
          `,
          [
            questionVo.question,
            questionVo.bonneReponse,
            questionVo.mauvaisesReponses,
            questionVo.tri,
          ],
        );

        const questionId = result.rows[0].id;

        await pool.query(
          `
          INSERT INTO tlmvpsp.question_theme(id_question, id_theme, ordre)
          VALUES ($1, $2, $3)
          `,
          [questionId, themeId, indexQuestion + 1],
        );
      }
      await pool.query("REFRESH MATERIALIZED VIEW tlmvpsp.themes_defi");
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}
