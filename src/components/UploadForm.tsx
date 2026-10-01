"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type ItemStatus = "parsing" | "ready" | "parse-error" | "submitting" | "done" | "submit-error";

interface QueueItem {
  key: string;
  file: File;
  status: ItemStatus;
  error?: string;
  cvText?: string;
  fileType?: string;
  name: string;
  email: string;
  phone: string;
  candidateId?: string;
}

export function UploadForm() {
  const [appliedRole, setAppliedRole] = useState<"PM" | "SPM">("PM");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function updateItem(key: string, patch: Partial<QueueItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  async function parseFile(item: QueueItem) {
    const form = new FormData();
    form.append("file", item.file);
    try {
      const res = await fetch("/api/candidates/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read that file.");
      updateItem(item.key, {
        status: "ready",
        cvText: data.cvText,
        fileType: data.fileType,
        name: data.detected.name,
        email: data.detected.email,
        phone: data.detected.phone,
      });
    } catch (err) {
      updateItem(item.key, {
        status: "parse-error",
        error: err instanceof Error ? err.message : "Something went wrong.",
      });
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const newItems: QueueItem[] = Array.from(fileList).map((file) => ({
      key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      status: "parsing",
      name: "",
      email: "",
      phone: "",
    }));
    setItems((prev) => [...prev, ...newItems]);
    for (const item of newItems) {
      parseFile(item);
    }
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  async function processAll() {
    setProcessing(true);
    // Sequential on purpose: each candidate create runs scoring + brief +
    // email drafting synchronously server-side (~15-30s of real Gemini
    // work). Firing them concurrently would just queue up behind the same
    // rate limits with no user-visible benefit, and makes per-item progress
    // impossible to show clearly.
    const ready = items.filter((it) => it.status === "ready");
    for (const item of ready) {
      updateItem(item.key, { status: "submitting" });
      try {
        const res = await fetch("/api/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appliedRole,
            fileName: item.file.name,
            fileType: item.fileType,
            cvText: item.cvText,
            name: item.name,
            email: item.email,
            phone: item.phone,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not save that candidate.");
        updateItem(item.key, { status: "done", candidateId: data.id });
      } catch (err) {
        updateItem(item.key, {
          status: "submit-error",
          error: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    }
    setProcessing(false);
  }

  const readyCount = items.filter((it) => it.status === "ready").length;
  const doneCount = items.filter((it) => it.status === "done").length;
  const totalToProcess = items.filter((it) => it.status === "ready" || it.status === "submitting" || it.status === "done" || it.status === "submit-error").length;
  const hasParsingItems = items.some((it) => it.status === "parsing");

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-xl bg-surface p-6 shadow-card space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Role applied for</label>
          <select
            value={appliedRole}
            onChange={(e) => setAppliedRole(e.target.value as "PM" | "SPM")}
            disabled={processing}
            className="border border-border rounded-md px-3 py-2 text-sm w-full bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
          >
            <option value="PM">Product Manager</option>
            <option value="SPM">Senior Product Manager</option>
          </select>
          <p className="text-xs text-muted mt-1">Applies to every CV in this batch.</p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
          <p className="text-sm text-foreground font-medium">Drop CVs here, or click to browse</p>
          <p className="text-xs text-muted mt-1">PDF, DOCX, or TXT — select as many as you like.</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <QueueRow
              key={item.key}
              item={item}
              onChange={(patch) => updateItem(item.key, patch)}
              onRemove={() => removeItem(item.key)}
              disabled={processing}
            />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="border border-border rounded-xl bg-surface p-4 shadow-card flex items-center justify-between">
          <p className="text-sm text-muted">
            {processing
              ? `Processing ${Math.min(doneCount + 1, totalToProcess)} of ${totalToProcess}… keep this tab open.`
              : hasParsingItems
                ? "Reading files…"
                : `${readyCount} ready to score.`}
          </p>
          <button
            onClick={processAll}
            disabled={processing || readyCount === 0}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {processing ? "Processing…" : `Score ${readyCount || ""} candidate${readyCount === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}

function QueueRow({
  item,
  onChange,
  onRemove,
  disabled,
}: {
  item: QueueItem;
  onChange: (patch: Partial<QueueItem>) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border border-border rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
        <StatusPill status={item.status} />
      </div>

      {item.status === "parse-error" && <p className="text-sm text-danger mt-2">{item.error}</p>}
      {item.status === "submit-error" && <p className="text-sm text-danger mt-2">{item.error}</p>}

      {item.status === "done" && item.candidateId && (
        <Link href={`/candidates/${item.candidateId}`} className="text-sm text-primary hover:text-primary-hover font-medium mt-2 inline-block">
          View candidate &rarr;
        </Link>
      )}

      {(item.status === "ready" || item.status === "submitting") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <input
            value={item.name}
            onChange={(e) => onChange({ name: e.target.value })}
            disabled={disabled || item.status === "submitting"}
            placeholder="Full name"
            className="border border-border bg-background rounded-md px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
          <input
            value={item.email}
            onChange={(e) => onChange({ email: e.target.value })}
            disabled={disabled || item.status === "submitting"}
            placeholder="Email"
            className="border border-border bg-background rounded-md px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
          <input
            value={item.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            disabled={disabled || item.status === "submitting"}
            placeholder="Phone (optional)"
            className="border border-border bg-background rounded-md px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
          />
        </div>
      )}

      {(item.status === "ready" || item.status === "parse-error" || item.status === "submit-error") && !disabled && (
        <button onClick={onRemove} className="text-xs text-muted hover:text-danger transition-colors mt-2">
          Remove
        </button>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: ItemStatus }) {
  const map: Record<ItemStatus, { label: string; className: string }> = {
    parsing: { label: "Reading", className: "border-warn/40 text-warn" },
    ready: { label: "Ready", className: "border-primary/40 text-primary" },
    "parse-error": { label: "Error", className: "border-danger/40 text-danger" },
    submitting: { label: "Scoring", className: "border-warn/40 text-warn" },
    done: { label: "Done", className: "border-success/40 text-success" },
    "submit-error": { label: "Failed", className: "border-danger/40 text-danger" },
  };
  const { label, className } = map[status];
  return (
    <span className={`flex-none inline-flex items-center gap-1.5 px-1.5 py-0.5 border text-[11px] font-mono uppercase tracking-wide ${className}`}>
      {(status === "parsing" || status === "submitting") && (
        <span className="w-2 h-2 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {label}
    </span>
  );
}
