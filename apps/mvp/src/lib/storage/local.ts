import fs from "node:fs";
import path from "node:path";

function downloadsDir(): string {
  return path.resolve(process.cwd(), "data", "font-files", "downloads");
}

function resolveDownloadPath(downloadPath: string): string {
  const baseDir = downloadsDir();
  const absolutePath = path.resolve(baseDir, downloadPath);
  const normalizedBase = `${baseDir}${path.sep}`;
  if (!absolutePath.startsWith(normalizedBase)) {
    throw new Error("Invalid download path");
  }
  return absolutePath;
}

export async function getFileBuffer(downloadPath: string): Promise<Buffer> {
  const filePath = resolveDownloadPath(downloadPath);
  return fs.promises.readFile(filePath);
}

export async function fileExists(downloadPath: string): Promise<boolean> {
  const filePath = resolveDownloadPath(downloadPath);
  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
