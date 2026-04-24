export async function saveFileContent(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

export async function loadFileBuffer(storedContent: string) {
  return Buffer.from(storedContent, "base64");
}
