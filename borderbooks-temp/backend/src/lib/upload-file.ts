import { asError } from "./errors";

export type UploadKind = "invoices" | "payments";

export async function uploadFile(kind: UploadKind, file: File, request: typeof fetch = fetch): Promise<{ id: string }> {
  try {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const response = await request("/api/uploads", { method: "POST", body: form });
    const data = await response.json().catch(() => ({})) as { id?: string; error?: string };
    if (!response.ok) throw new Error(data.error || `Could not upload ${file.name}`);
    if (!data.id) throw new Error("Upload response did not include an id");
    return { id: data.id };
  } catch (value) {
    throw asError(value, `Could not upload ${file.name}`);
  }
}
