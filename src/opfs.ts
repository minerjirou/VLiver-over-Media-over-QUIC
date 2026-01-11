export async function writeToOpfs(filename: string, data: ArrayBuffer): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

export async function readFromOpfs(filename: string): Promise<ArrayBuffer | null> {
  const root = await navigator.storage.getDirectory();
  try {
    const handle = await root.getFileHandle(filename);
    const file = await handle.getFile();
    return await file.arrayBuffer();
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return null;
    }
    throw error;
  }
}
