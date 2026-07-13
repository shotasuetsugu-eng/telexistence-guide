import { useState } from "react";
import { createWorker } from "tesseract.js";
import { Upload, Loader2, Trash2, Plus } from "lucide-react";

type Row = {
  id: string;
  storeName: string;
  chain: string;
  area: string;
  deployDate: string;
  startTime: string;
};

function makeEmptyRow(): Row {
  return {
    id: Math.random().toString(36).slice(2),
    storeName: "",
    chain: "",
    area: "",
    deployDate: "",
    startTime: "",
  };
}

function parseOcrText(text: string): Row[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: Row[] = [];
  const dateRe = /(\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2})/;
  const chainRe = /\b(SEJ|FM|LAW)\b/i;
  const timeRe = /\b(\d{1,2}:\d{2})\b/;

  for (const line of lines) {
    const dateMatch = line.match(dateRe);
    const chainMatch = line.match(chainRe);
    if (!dateMatch && !chainMatch) continue;

    const timeMatch = line.match(timeRe);

    let storeName = line;
    if (dateMatch) storeName = storeName.replace(dateMatch[0], "");
    if (chainMatch) storeName = storeName.replace(chainMatch[0], "");
    if (timeMatch) storeName = storeName.replace(timeMatch[0], "");
    storeName = storeName.replace(/[|｜,、]/g, " ").replace(/\s+/g, " ").trim();

    let deployDate = "";
    if (dateMatch) {
      const raw = dateMatch[0];
      const parts = raw.split("/").map((p) => p.padStart(2, "0"));
      if (parts.length === 3) {
        deployDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
      } else if (parts.length === 2) {
        const year = new Date().getFullYear();
        deployDate = `${year}-${parts[0]}-${parts[1]}`;
      }
    }

    rows.push({
      id: Math.random().toString(36).slice(2),
      storeName,
      chain: chainMatch ? chainMatch[0].toUpperCase() : "",
      area: "",
      deployDate,
      startTime: timeMatch ? timeMatch[0] : "",
    });
  }

  return rows.length > 0 ? rows : [makeEmptyRow()];
}

export default function StoreImportAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [rawText, setRawText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setErrorMessage(null);
    setResultMessage(null);
    setIsOcrRunning(true);
    setOcrProgress(0);
    try {
      const worker = await createWorker("jpn", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();
      setRawText(data.text);
      setRows(parseOcrText(data.text));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "OCRに失敗しました");
    } finally {
      setIsOcrRunning(false);
    }
  }

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows((current) =>
      current.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((r) => r.id !== id));
  }

  function addRow() {
    setRows((current) => [...current, makeEmptyRow()]);
  }

  async function handleSubmit() {
    setErrorMessage(null);
    setResultMessage(null);
    const validRows = rows.filter((r) => r.storeName.trim() && r.deployDate.trim());
    if (validRows.length === 0) {
      setErrorMessage("店舗名と配備日が入力された行がありません。");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      try {
        const res = await fetch("/api/deploy-schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deployDate: row.deployDate,
            endDate: row.deployDate,
            storeName: row.storeName,
            area: row.area,
            chain: row.chain,
            workType: "Deployment",
            startTime: row.startTime || undefined,
          }),
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsSubmitting(false);
    setResultMessage(
      `登録完了: 成功 ${successCount}件${failCount > 0 ? ` / 失敗 ${failCount}件` : ""}`
    );
    if (successCount > 0) {
      setRows((current) =>
        current.filter((r) => !(r.storeName.trim() && r.deployDate.trim()))
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">店舗一覧取込（OCR）</h2>
        <p className="text-sm text-muted-foreground mt-1">
          店舗一覧のスクリーンショットを貼り付けると、文字を読み取って一覧を作成します。
          読み取り精度は完全ではないため、登録前に内容を確認・修正してください。
        </p>
      </div>

      <div className="cyber-border rounded-lg bg-card p-4">
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            クリックして画像を選択、またはドラッグ＆ドロップ
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
              e.target.value = "";
            }}
          />
        </label>

        {isOcrRunning && (
          <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            文字を読み取っています… {ocrProgress}%
          </div>
        )}

        {errorMessage && (
          <p className="text-sm text-red-500 mt-4">{errorMessage}</p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="cyber-border rounded-lg bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">読み取り結果（確認・修正してください）</h3>
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-4 w-4" />
              行を追加
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">店舗名</th>
                  <th className="py-2 pr-2">チェーン</th>
                  <th className="py-2 pr-2">エリア</th>
                  <th className="py-2 pr-2">配備日</th>
                  <th className="py-2 pr-2">開始時刻</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50">
                    <td className="py-1 pr-2">
                      <input
                        type="text"
                        value={row.storeName}
                        onChange={(e) =>
                          updateRow(row.id, "storeName", e.target.value)
                        }
                        className="w-full bg-transparent border border-border rounded px-2 py-1"
                        placeholder="店舗名"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        value={row.chain}
                        onChange={(e) =>
                          updateRow(row.id, "chain", e.target.value)
                        }
                        className="w-full bg-transparent border border-border rounded px-2 py-1"
                      >
                        <option value="">-</option>
                        <option value="SEJ">SEJ</option>
                        <option value="FM">FM</option>
                        <option value="LAW">LAW</option>
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="text"
                        value={row.area}
                        onChange={(e) =>
                          updateRow(row.id, "area", e.target.value)
                        }
                        className="w-full bg-transparent border border-border rounded px-2 py-1"
                        placeholder="関東など"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="date"
                        value={row.deployDate}
                        onChange={(e) =>
                          updateRow(row.id, "deployDate", e.target.value)
                        }
                        className="w-full bg-transparent border border-border rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="time"
                        value={row.startTime}
                        onChange={(e) =>
                          updateRow(row.id, "startTime", e.target.value)
                        }
                        className="w-full bg-transparent border border-border rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {isSubmitting ? "登録中…" : "FS Team Calendarに登録"}
            </button>
            {resultMessage && (
              <span className="text-sm text-green-500">{resultMessage}</span>
            )}
          </div>
        </div>
      )}

      {rawText && (
        <details className="cyber-border rounded-lg bg-card p-4">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            読み取った生テキストを表示
          </summary>
          <pre className="text-xs whitespace-pre-wrap mt-2 text-muted-foreground">
            {rawText}
          </pre>
        </details>
      )}
    </div>
  );
}
