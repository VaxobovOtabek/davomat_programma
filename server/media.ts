import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { config } from "./config.js";
import { fail } from "./security.js";
const supabase =
  config.storageUrl && config.storageKey
    ? createClient(config.storageUrl, config.storageKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
export async function saveImage(data: string, path: string, kind: string) {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(data))
    fail(400, "JPEG, PNG yoki WebP rasm yuklang.");
  const buf = Buffer.from(data.split(",")[1] || "", "base64");
  if (buf.length > (kind === "avatar" ? 2 : 1) * 1024 * 1024)
    fail(400, "Rasm hajmi me’yordan katta.");
  let image: Buffer;
  try {
    image = await sharp(buf, { limitInputPixels: 16000000 })
      .rotate()
      .resize(960, 960, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();
  } catch {
    fail(400, "Rasm fayli buzilgan.");
  }
  if (supabase) {
    const { error } = await supabase.storage
      .from(config.bucket)
      .upload(path, image!, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error("Storage upload failed");
  } else {
    await mkdir(config.dataDir + "/media", { recursive: true });
    await writeFile(
      config.dataDir + "/media/" + path.replaceAll("/", "_"),
      image!,
    );
  }
}
export async function readImage(path: string) {
  if (supabase) {
    const { data, error } = await supabase.storage
      .from(config.bucket)
      .download(path);
    if (error || !data) fail(404, "Rasm topilmadi.");
    return Buffer.from(await data!.arrayBuffer());
  }
  return readFile(config.dataDir + "/media/" + path.replaceAll("/", "_"));
}
