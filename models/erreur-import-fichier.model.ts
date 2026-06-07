export interface ErreurImportFichier {
  ligne: number;
  type: "warning" | "error";
  message: string;
}
