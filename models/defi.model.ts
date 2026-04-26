export interface Defi {
  libelleTheme: string;
  questionsDefi: QuestionDefi[];
}

export interface QuestionDefi {
  question: string;
  bonneReponse: string;
  mauvaisesReponses: string[];
  ordre: number;
}
