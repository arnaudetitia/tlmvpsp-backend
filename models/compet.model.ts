export interface QuestionTheme {
  libelle_theme: string;
  questions_compet: Question[];
}

export interface Question {
  question: string;
  bonne_reponse: string;
  mauvaises_reponses: string[];
  tri: string;
  ordre: number;
  musique_question: string;
  musique_reponse: string;
  aliases?: string[];
}
