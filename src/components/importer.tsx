"use client";
import { useState } from "react";
import {
  Upload,
  Download,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  parseCSV,
  importFields,
  previewImport,
  commitImport,
  downloadCSV,
  type ImportKind,
  type DuplicateMode,
  type ImportRow,
} from "@/lib/csv";
import type { Workspace } from "@/lib/domain";
import { commit } from "@/lib/store";
import { Button, Modal } from "./ui";
export function Importer({
  s,
  kind,
  onClose,
  onDone,
}: {
  s: Workspace;
  kind: ImportKind;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [rows, setRows] = useState<string[][] | null>(null),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<ImportRow[] | null>(null),
    [filename, setFilename] = useState(""),
    [error, setError] = useState(""),
    [duplicates, setDuplicates] = useState<DuplicateMode>("skip"),
    [fictional, setFictional] = useState(false);
  const fields = importFields[kind];
  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    setPreview(null);
    setRows(null);
    setFictional(false);
    try {
      if (file.size > 2000000)
        throw new Error("Choose a file smaller than 2 MB.");
      const parsed = parseCSV(await file.text());
      setRows(parsed);
      setFilename(file.name);
      setMapping(
        Object.fromEntries(
          fields.map((f) => [
            f,
            parsed[0].find((h) => h.toLowerCase().replace(/\s+/g, "_") === f) ??
              "",
          ]),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    }
  }
  function template() {
    downloadCSV(
      `relay-${kind}-template.csv`,
      [...fields],
      kind === "company"
        ? [
            [
              "Cedar House Studio",
              "Creative",
              "Austin, TX",
              "https://cedarhouse.example.com",
            ],
          ]
        : [
            [
              "Alex Morgan",
              "alex.morgan@example.com",
              "Juniper Studio",
              "Founder",
              "(555) 010-2000",
            ],
          ],
    );
  }
  function showPreview() {
    const required =
      kind === "company" ? ["name"] : ["name", "email", "company"];
    if (required.some((f) => !mapping[f])) {
      setError("Map each required field before previewing.");
      return;
    }
    const mapped = Object.values(mapping).filter(Boolean);
    if (new Set(mapped).size !== mapped.length) {
      setError("Each CSV column can only be mapped once.");
      return;
    }
    setError("");
    setPreview(previewImport(s, kind, rows!, mapping));
  }
  function importNow() {
    if (!preview || !fictional) return;
    setError("");
    try {
      const count = preview.filter(
        (r) => !r.duplicateId || duplicates === "update",
      ).length;
      commit((s) => commitImport(s, kind, preview, duplicates));
      onDone(
        `Imported ${count} ${kind === "company" ? "companies" : "contacts"}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    }
  }
  const errors = preview?.filter((r) => r.error).length ?? 0,
    dupes = preview?.filter((r) => r.duplicateId).length ?? 0;
  return (
    <Modal
      title={`Import ${kind === "company" ? "companies" : "contacts"}`}
      description="A careful import. No surprises."
      onClose={onClose}
      className="import-modal"
    >
      <div className="import-content">
        <div className="import-steps">
          <span className={!rows ? "active" : ""}>1. Choose file</span>
          <ArrowRight size={12} />
          <span className={rows && !preview ? "active" : ""}>
            2. Map fields
          </span>
          <ArrowRight size={12} />
          <span className={preview ? "active" : ""}>3. Review & import</span>
        </div>
        <p className="notice">
          This is a public demo. Import fictional data only. Everything stays in
          this browser; each visitor has an independent workspace.
        </p>
        <div className="import-file-heading">
          <span>
            <FileSpreadsheet size={16} />
            {filename || "CSV · up to 1,000 rows · 2 MB"}
          </span>
          <Button onClick={template}>
            <Download size={14} />
            Get template
          </Button>
        </div>
        {!preview && (
          <label className="upload-zone">
            <Upload size={24} />
            <strong>
              {rows ? "Choose a different file" : "Choose your CSV file"}
            </strong>
            <span>
              Companies first, then contacts. Contact emails must use
              example.com.
            </span>
            <input
              type="file"
              aria-label="Choose CSV file"
              accept=".csv,text/csv"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
        )}
        {rows && !preview && (
          <div className="mapping-table">
            <h3>
              Match your columns <span>{rows.length - 1} rows found</span>
            </h3>
            {fields.map((f) => (
              <label className="mapping-row" key={f}>
                <span>
                  {f === "company"
                    ? "Company name"
                    : f[0].toUpperCase() + f.slice(1)}
                  {(kind === "company"
                    ? ["name"]
                    : ["name", "email", "company"]
                  ).includes(f) && <b> *</b>}
                </span>
                <ArrowRight size={14} />
                <select
                  aria-label={`Map ${f}`}
                  value={mapping[f] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [f]: e.target.value }))
                  }
                >
                  <option value="">Skip this field</option>
                  {rows[0].map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
        {preview && (
          <>
            <div className={`import-validation ${errors ? "invalid" : ""}`}>
              {errors ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              <div>
                <strong>
                  {errors
                    ? `${errors} ${errors === 1 ? "row needs" : "rows need"} attention`
                    : `${preview.length} rows validated`}
                </strong>
                <span>
                  {errors
                    ? "Fix the source CSV and upload it again. Nothing has been imported."
                    : `${dupes} existing duplicates found. Review the preview before committing.`}
                </span>
              </div>
            </div>
            <label className="field">
              <span>Existing duplicates</span>
              <select
                aria-label="Duplicate handling"
                value={duplicates}
                onChange={(e) => setDuplicates(e.target.value as DuplicateMode)}
              >
                <option value="skip">Skip existing records</option>
                <option value="update">Update existing records</option>
              </select>
              <small>
                Companies match by name; contacts match by email. Relationships
                are preserved.
              </small>
            </label>
            <div className="import-preview">
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    {fields.map((f) => (
                      <th key={f}>{f}</th>
                    ))}
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((r) => (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      {fields.map((f) => (
                        <td key={f}>{r.data[f] || "—"}</td>
                      ))}
                      <td>
                        {r.error ? (
                          <span className="overdue-text">{r.error}</span>
                        ) : r.duplicateId ? (
                          <span>
                            {duplicates === "skip"
                              ? "Skip duplicate"
                              : "Update existing"}
                          </span>
                        ) : (
                          <span className="success-text">New record</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 50 && (
              <p className="small-copy muted">
                Showing the first 50 of {preview.length} rows. All rows have
                been validated.
              </p>
            )}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={fictional}
                onChange={(e) => setFictional(e.target.checked)}
              />
              I confirm this file contains fictional demo data.
            </label>
          </>
        )}
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        <div className="form-footer">
          <Button
            onClick={
              preview
                ? () => {
                    setPreview(null);
                    setError("");
                    setFictional(false);
                  }
                : onClose
            }
          >
            {preview ? "Back to mapping" : "Cancel"}
          </Button>
          {preview ? (
            <Button
              variant="primary"
              onClick={importNow}
              disabled={errors > 0 || !fictional}
            >
              Import{" "}
              {
                preview.filter((r) => !r.duplicateId || duplicates === "update")
                  .length
              }{" "}
              records
              <ArrowRight size={15} />
            </Button>
          ) : (
            <Button variant="primary" disabled={!rows} onClick={showPreview}>
              Preview import
              <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
