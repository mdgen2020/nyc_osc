import { FormEvent, useRef, useState } from "react";
import { Api } from "../lib/api";
import { VerifyPanel } from "../components/VerifyPanel";

const CATEGORIES = [
  ["signed_claim_form", "Signed claim form"], ["proof_old_address", "Proof of old address"],
  ["proof_ownership", "Proof of ownership"], ["name_change", "Proof of name change"],
  ["estate_documentation", "Estate documentation"], ["representative_authorization", "Representative authorization"],
  ["other", "Other"],
] as const;
const MAX = 10 * 1024 * 1024;
const OK_TYPES = ["pdf", "png", "jpg", "jpeg", "tif", "tiff"];

/** Secure mock upload. Only file metadata (type, size, category) reaches the backend; file contents are never stored or committed. */
export function Upload({ api }: { api: Api }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const file = fileRef.current?.files?.[0] ?? null;
    if (!file || !file.name) { setError("Choose a file to upload."); return; }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!OK_TYPES.includes(ext)) { setError("Accepted formats are PDF, PNG, JPG and TIF."); return; }
    if (file.size > MAX) { setError("Files must be under 10 MB."); return; }
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(file.name) || file.name.length > 100) { setError("File names may use only letters, numbers, dashes and underscores, up to 100 characters."); return; }
    const r = await api.call("createUploadReceipt", { verificationToken: token, category: f.get("category"), fileType: ext, sizeBytes: file.size });
    if (r.ok) setReceipt(r.receiptId); else setError(r.message ?? "The upload could not be completed.");
  }

  return (
    <section>
      <h1>Upload documents (secure demo page)</h1>
      <p className="notice">Demonstration only. Nothing is stored: this page records a fictional receipt and discards the file. Do not upload real documents.</p>
      {!token && <VerifyPanel api={api} onVerified={setToken} />}
      {token && !receipt && (
        <form onSubmit={submit} noValidate>
          {error && <p role="alert" className="error">{error}</p>}
          <div className="field">
            <label htmlFor="category">Document type</label>
            <select id="category" name="category">{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="file">File</label>
            <input id="file" name="file" ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff" aria-describedby="file-help" />
            <p id="file-help" className="small">PDF, PNG, JPG or TIF. Must be under 10 MB. Not password protected.</p>
          </div>
          <button className="btn">Submit document</button>
        </form>
      )}
      {receipt && (
        <div role="status" className="panel">
          <h2>Upload received</h2>
          <p>Your fictional receipt number is <strong>{receipt}</strong>. In a real process, allow up to 90 days for review after documents are received.</p>
        </div>
      )}
    </section>
  );
}
