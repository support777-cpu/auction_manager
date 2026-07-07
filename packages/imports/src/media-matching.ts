import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import sharp from "sharp";

export interface UploadedMediaDescriptor {
  readonly filename: string;
  readonly content: Buffer;
}

export function stripExtension(filename: string): string {
  const name = basename(filename);
  const extension = extname(name);
  return extension ? name.slice(0, -extension.length) : name;
}

export function normalizeMatchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function uniqueCandidates<TFile extends UploadedMediaDescriptor, TCandidate extends { file: TFile }>(
  candidates: readonly TCandidate[]
): TCandidate[] {
  const seen = new Set<TFile>();
  const unique: TCandidate[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.file)) {
      continue;
    }

    seen.add(candidate.file);
    unique.push(candidate);
  }

  return unique;
}

export async function normalizeAndStoreMedia<TDecodeCode extends string, TStorageCode extends string>({
  file,
  assetDirectory,
  assetId,
  decodeFailureCode,
  storageFailureCode
}: {
  file: UploadedMediaDescriptor;
  assetDirectory: string;
  assetId: string;
  decodeFailureCode: TDecodeCode;
  storageFailureCode: TStorageCode;
}): Promise<{ ok: true } | { ok: false; code: TDecodeCode | TStorageCode }> {
  let normalizedMedia: Buffer;
  try {
    normalizedMedia = await sharp(file.content, { failOn: "error" })
      .rotate()
      .resize({
        width: 512,
        height: 512,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp()
      .toBuffer();
  } catch {
    return { ok: false, code: decodeFailureCode };
  }

  try {
    await mkdir(assetDirectory, { recursive: true });
    await writeFile(join(assetDirectory, `${assetId}.webp`), normalizedMedia);
    return { ok: true };
  } catch {
    return { ok: false, code: storageFailureCode };
  }
}
