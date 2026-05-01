import express, { Application } from "express";
import cors from "cors";
import path from "path";
import { QualifsController } from "./controllers/qualifs.controller";
import { CompetController } from "./controllers/compet.controller";
import { QuestionTheme } from "./models/compet.model";
import { DefiController } from "./controllers/defi.controller";
import { Defi } from "./models/defi.model";
import { Server, Socket } from "socket.io";
import { WebSocketServer } from "ws";
import { createServer } from "http";

export class App {
  app: Application;
  qualifsController: QualifsController;
  competController: CompetController;
  defiController: DefiController;

  httpServer: any;
  io: Server;

  constructor() {
    this.app = express();
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

  private routes(): void {
    //QUALIFS
    this.app.get("/qualifs", async (req, res) => {
      try {
        const qualifs = await this.qualifsController.getQualifs();
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

    this.app.get("/compet/questions", async (req, res) => {
      try {
        const compet = await this.competController.getCompetByTheme();
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
    this.app.get("/defi/themes", async (req, res) => {
      try {
        const themesLibelles = await this.defiController.getLibelleThemes();
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

    this.app.get("/defi/champion", async (req, res) => {
      try {
        const champion = await this.defiController.getChampion();
        res.json(champion.nom_champion);
      } catch (error) {
        console.error("Erreur lors de la récupération du champion", error);
        res.status(500).json({ error: "Erreur serveur" });
      }
    });

    this.app.put("/defi/champion", async (req, res) => {
      try {
        const newChampion = req.body.newChampion;
        await this.defiController.putChampion(newChampion);
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
