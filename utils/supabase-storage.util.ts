import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import dotenv from "dotenv";

export class SupabaseStorageUtil {
  private static readonly defaultBucket = "tlmvpsp/extraits";

  public static async uploadMusic(musicName: string, content: Buffer) {
    const baseName = musicName.trim();
    if (
      !baseName ||
      path.basename(baseName) !== baseName ||
      baseName === "." ||
      baseName === ".."
    ) {
      throw new Error("Nom de fichier MP3 invalide");
    }

    const project = process.env.SUPABASE_PROJECT;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || this.defaultBucket;

    if (!project || !serviceRoleKey) {
      throw new Error(
        "SUPABASE_PROJECT et SUPABASE_SERVICE_ROLE_KEY doivent être configurés",
      );
    }

    dotenv.config({
      path: `environments/environment.${process.env.NODE_ENV}`,
    });
    const supabaseClient = createClient(
      `https://${process.env.SUPABASE_PROJECT}.supabase.co`,
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    );
    const fileName = `${baseName}.mp3`;
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(`extraits/${fileName}`, content, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (error) {
      throw new Error(
        "Problème dans l'ajout de l''extrait dans le storage distant",
      );
    }
  }
}
