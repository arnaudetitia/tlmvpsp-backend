import express, { Application } from "express";
import cors from "cors";
import path from "path";
import { QualifsController } from "./controllers/qualifs.controller";
import { CompetController } from "./controllers/compet.controller";
import { QuestionTheme } from "./models/compet.model";
import { DefiController } from "./controllers/defi.controller";
import { Defi } from "./models/defi.model";
import { Server } from "socket.io";
import { createServer } from "http";
import { PartieController } from "./controllers/partie.controller";
import { QuestionController } from "./controllers/question.controller";
import { ErreurImportFichier } from "./models/erreur-import-fichier.model";

export class App {
  app: Application;
  partieController: PartieController;
  questionsController: QuestionController;
  qualifsController: QualifsController;
  competController: CompetController;
  defiController: DefiController;
  upload: any;

  httpServer: any;
  io: Server;

  constructor() {
    this.app = express();
    this.partieController = new PartieController();
    this.questionsController = new QuestionController();
    this.qualifsController = new QualifsController();
    this.competController = new CompetController();
    this.defiController = new DefiController();
    this.config();

    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
      },
    });
    this.configureStorage();
    this;
    this.routes();
  }

  private config(): void {
    this.app.use(
      cors({
        exposedHeaders: ["ngrok-skip-browser-warning"],
      }),
    );
    this.app.use(express.json());
  }

  configureStorage() {
    const multer = require("multer");
    const storage = multer.diskStorage({
      destination: function (req: any, file: any, cb: any) {
        cb(
          null,
          path.join(
            __dirname,
            "../../../Projets Angular/tlmvpsp-frontend/src/assets/extraits/",
          ),
        );
      },
      filename: function (req: any, file: any, cb: any) {
        cb(null, file.originalname);
      },
    });
    this.upload = multer({ storage: storage });
  }

  private routes(): void {
    //PARTIES
    this.app.get("/parties", async (req, res) => {
      try {
        const parties = await this.partieController.getAllParties();
        res.json(
          parties.map((partie) => {
            return { ...partie, id_compet: Number(partie.id_compet) };
          }),
        );
      } catch (error) {
        console.error("Erreur lors de la récupération des parties:", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    this.app.post("/parties", async (req, res) => {
      try {
        const nomPartie = req.body.nomPartie;
        const idsQuestionsQualifs = req.body.idsQuestionsQualifs;
        const idThemeCompet = Number.parseInt(req.body.idThemeCompet);
        const idsThemesDefi = req.body.idsThemesDefi;
        const idChampion = Number.parseInt(req.body.idChampion);
        await this.partieController.createNouvellePartie(
          nomPartie,
          idsQuestionsQualifs,
          idThemeCompet,
          idsThemesDefi,
          idChampion,
        );
        const parties = await this.partieController.getAllParties();
        res.json(parties);
      } catch (error) {
        console.error(
          "Erreur lors de la sauvegarde d'une nouvelle partie:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    this.app.get("/parties/champions", async (req, res) => {
      try {
        const ligneesChampions =
          await this.partieController.getAllLigneesChampion();
        res.json(ligneesChampions);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des lignees de champion:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    this.app.get("/parties/qualifs", async (req, res) => {
      try {
        const questionsQualifs =
          await this.partieController.getAllQuestionsQualifs();
        res.json(questionsQualifs);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des questions des qualifs:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    this.app.get("/parties/compet", async (req, res) => {
      try {
        const themesCompet = await this.partieController.getAllThemesCompet();
        res.json(
          themesCompet.map((theme) => {
            return {
              ...theme,
              id: Number(theme.id),
            };
          }),
        );
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des themes de la compet:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    this.app.get("/parties/defi", async (req, res) => {
      try {
        const themesDefi = await this.partieController.getAllThemesDefi();
        res.json(
          themesDefi.map((theme) => {
            return {
              ...theme,
              id: Number(theme.id),
            };
          }),
        );
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des themes du defi:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.put("/parties/:idPartie/flag", async (req, res) => {
      const idPartie = Number.parseInt(req.params.idPartie);
      try {
        await this.partieController.flagPartieEncours(true, idPartie);
        res.json(true);
      } catch (error) {
        console.error("Erreur lors du flag d'une partie:", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.put("/parties/unflag", async (req, res) => {
      try {
        await this.partieController.flagPartieEncours(false);
        res.json(true);
      } catch (error) {
        console.error("Erreur lors de l'unflag d'une partie:", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    // QUESTIONS
    this.app.get("/questions", async (req, res) => {
      try {
        const allQuestions = await this.questionsController.getAllQuestions();
        res.json(
          allQuestions.map((question) => {
            return {
              ...question,
              id: Number(question.id),
              id_theme: question.id_theme ? Number(question.id_theme) : null,
            };
          }),
        );
      } catch (error) {
        console.error(
          "Erreur lors de la récupération de toutes les questions:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    this.app.post(
      "/questions",
      this.upload.single("musicFile"),
      async (req, res) => {
        try {
          const question = JSON.parse(req.body.question);
          await this.questionsController.createQuestion(question);
          const allQuestions = await this.questionsController.getAllQuestions();
          res.json(
            allQuestions.map((question) => {
              return {
                ...question,
                id: Number(question.id),
                id_theme: question.id_theme ? Number(question.id_theme) : null,
              };
            }),
          );
        } catch (error) {
          console.error("Erreur lors de la création d'une question:", error);
          res.status(500).json({ error: "Erreur serveur" });
        }
      },
    );
    this.app.put(
      "/questions/:idQuestion",
      this.upload.single("musicFile"),
      async (req, res) => {
        try {
          const idQuestion = parseInt(req.params.idQuestion);
          const question = JSON.parse(req.body.question);
          await this.questionsController.updateQuestion(idQuestion, question);
          const allQuestions = await this.questionsController.getAllQuestions();
          res.json(
            allQuestions.map((question) => {
              return {
                ...question,
                id: Number(question.id),
                id_theme: question.id_theme ? Number(question.id_theme) : null,
              };
            }),
          );
        } catch (error) {
          console.error(
            "Erreur lors de la modification d'une question:",
            error,
          );
          res.status(500).json({ error: "Erreur serveur" });
        }
      },
    );
    this.app.post("/questions/import", async (req, res) => {
      try {
        const manche = req.body.manche;
        const csvContent = req.body.csvFileContent;
        const doImport = req.body.doImport;
        let erreurs: ErreurImportFichier[] = [];
        switch (manche) {
          case "QUALIFS":
            erreurs = await this.questionsController.importQuestionsQualifs(
              csvContent,
              doImport,
            );
            break;

          case "COMPET":
            erreurs = await this.questionsController.importQuestionsCompet(
              csvContent,
              doImport,
            );
            break;

          case "DEFI":
            erreurs = await this.questionsController.importQuestionsDefi(
              csvContent,
              doImport,
            );
            break;
          default:
            console.warn(
              `Manche ${manche} non reconnue pour l'import de questions ( en tout cas pas encore) `,
            );
            break;
        }
        if (erreurs.length > 0) {
          res.json({ erreurs, questions: [] });
        } else {
          const allQuestions = await this.questionsController.getAllQuestions();
          res.json({
            erreurs: [],
            questions: allQuestions.map((question) => {
              return {
                ...question,
                id: Number(question.id),
                id_theme: question.id_theme ? Number(question.id_theme) : null,
              };
            }),
          });
        }
      } catch (error) {
        console.error("Erreur lors de l'import des questions':", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    //QUALIFS
    this.app.get("/qualifs/:idPartie", async (req, res) => {
      const idPartie = parseInt(req.params.idPartie);
      try {
        const qualifs = await this.qualifsController.getQualifs(idPartie);
        res.json(qualifs);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des qualifications:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    //COMPET
    this.app.post("/compet/joueurs", async (req, res) => {
      const joueursCompet = req.body.joueursCompet;
      try {
        await this.competController.setJoueursCompet(joueursCompet);
        res.json(true);
      } catch (error) {
        console.error(
          "Erreur lors de l'enregistrement de joueurs qualiiés pour la compet",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.get("/compet/joueurs", async (req, res) => {
      try {
        const joueurs = await this.competController.getJoueursCompet();
        res.json(
          joueurs.map((joueur) => {
            return {
              nomJoueur: joueur.nom_joueur,
              connected: joueur.connected,
              reponseDonnee: joueur.reponseDonnee,
            };
          }),
        );
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des joueur de la compet",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.put("/compet/joueurs", async (req, res) => {
      const nomJoueurToConnect = req.body.nomJoueur;
      try {
        await this.competController.connectJoueur(nomJoueurToConnect);
        res.json(true);
      } catch (error) {
        console.error(
          `Erreur lors de la connexion du joueur ${nomJoueurToConnect} :`,
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.get("/compet/questions/:idPartie", async (req, res) => {
      const idPartie = parseInt(req.params.idPartie);
      try {
        const compet = await this.competController.getCompetByTheme(idPartie);
        const competResult: QuestionTheme = {
          libelle_theme:
            compet.length > 0 ? compet[0].libelle_theme : "Inconnu",
          questions_compet: compet.map((item) => ({
            question: item.question,
            bonne_reponse: item.bonne_reponse,
            mauvaises_reponses: item.mauvaises_reponses,
            tri: item.tri,
            ordre: item.ordre,
            musique: item.musique,
            jouee_apres_question: item.jouee_apres_question,
            aliases: item.aliases,
          })),
        };
        res.json(competResult);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des questions de Compet:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.post("/compet/question/current", async (req, res) => {
      try {
        this.competController.setCurrentQuestion(
          req.body.question,
          req.body.reponsesDisplay,
        );
        this.io.emit("nouvelle-question", {
          question: req.body.question,
          reponsesDisplay: req.body.reponsesDisplay,
        });
        res.json(true);
      } catch (error) {
        console.error(
          "Erreur lors de l'envoi de la question aux candidats",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.get("/compet/question/current", async (req, res) => {
      try {
        const result = await this.competController.getCurrentQuestion();
        res.json(
          result.map((qcd) => {
            return {
              question: qcd.question,
              reponsesDisplay: qcd.reponse_display,
            };
          }),
        );
      } catch (error) {
        console.error(
          "Erreur lors de l'envoi de la question aux candicats",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.put("/compet/open-votes", async (req, res) => {
      try {
        this.io.emit("afficher-reponses-remote");
        res.json(true);
      } catch (error) {
        console.error("Erreur lors de l'ouverture des votes", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.put("/compet/close-votes", async (req, res) => {
      try {
        this.io.emit("close-votes");
        res.json(true);
      } catch (error) {
        console.error("Erreur lors de l'ouverture des votes", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.put("/compet/freeze-votes", async (req, res) => {
      try {
        this.io.emit("freeze-votes");
        res.json(true);
      } catch (error) {
        console.error("Erreur lors de l'ouverture des votes", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.put("/compet/joueur/reponse", async (req, res) => {
      try {
        await this.competController.envoyerReponse(
          req.body.joueur,
          req.body.reponse,
        );
        this.io.emit("reponse-joueur", {
          joueur: req.body.joueur,
          reponse: req.body.reponse,
        });
        res.json(true);
      } catch (error) {
        console.error("Erreur lors de l'envoi de la réponse", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    //DEFI
    this.app.get("/defi/themes/:idPartie", async (req, res) => {
      const idPartie = parseInt(req.params.idPartie);
      try {
        const themesLibelles =
          await this.defiController.getLibelleThemes(idPartie);
        res.json(themesLibelles);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des libellés des thèmes:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });
    this.app.get("/defi/questions/:idTheme", async (req, res) => {
      const idTheme = parseInt(req.params.idTheme, 10);
      try {
        const questions = await this.defiController.getQuestionTheme(idTheme);
        const defi: Defi = {
          libelleTheme:
            questions.length > 0 ? questions[0].libelle_theme : "Inconnu",
          questionsDefi: questions.map((item) => ({
            question: item.question,
            bonneReponse: item.bonne_reponse,
            mauvaisesReponses: item.mauvaises_reponses,
            tri: item.tri,
            ordre: item.ordre,
          })),
        };
        res.json(defi);
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des questions du défi:",
          error,
        );
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.get("/defi/champion/:idPartie", async (req, res) => {
      try {
        const idPartie = Number.parseInt(req.params.idPartie);
        const champion = await this.defiController.getChampion(idPartie);
        res.json(champion.nom_champion);
      } catch (error) {
        console.error("Erreur lors de la récupération du champion", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.put("/defi/champion/:idPartie", async (req, res) => {
      try {
        const idPartie = Number.parseInt(req.params.idPartie);
        const newChampion = req.body.newChampion;
        await this.defiController.putChampion(idPartie, newChampion);
        res.json(true);
      } catch (error) {
        console.error("Erreur lors de la récupération du champion", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    const distPath = path.join(
      __dirname,
      "../../../Projets Angular/tlmvpsp-remote/dist/tlmvpsp-remote/browser",
    );

    this.app.use(express.static(distPath));

    this.app.use((req, res, next) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  public listen(port: number): void {
    this.httpServer.listen(port, () => {
      console.log(`🚀 Serveur en classe tournant sur http://localhost:${port}`);
    });
  }
}
