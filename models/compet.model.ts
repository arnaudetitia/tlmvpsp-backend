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
  musique: string;
  jouee_apres_question: boolean;
  aliases?: string[];
}
