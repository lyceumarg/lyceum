"use client";

type Col<T> = { key: keyof T; label: string; format?: (v: any, row: T) => string };

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ExportCsvButton<T extends Record<string, any>>({
  rows, columns, filename, label = "Exportar CSV",
}: {
  rows: T[];
  columns: Col<T>[];
  filename: string;
  label?: string;
}) {
  function exportar() {
    const header = columns.map((c) => csvEscape(c.label)).join(";");
    const body = rows
      .map((r) => columns.map((c) => csvEscape(c.format ? c.format(r[c.key], r) : r[c.key])).join(";"))
      .join("\n");
    const csv = "\uFEFF" + header + "\n" + body; // BOM para que Excel abra bien los acentos
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={exportar} disabled={!rows.length}>
      {label}
    </button>
  );
}
