import { useMemo, useState } from "react";

type SheetItem = {
  label: string;
  url: string;
};

const measurementSheet: SheetItem = {
  label: "メジャメント数値",
  url: "https://docs.google.com/spreadsheets/d/1FEU1wA1Rzp_FU4h4OQ7qhreawlsOqwUdqY2z9rs6e_E/edit?gid=268657057#gid=268657057",
};

const shiftList: SheetItem[] = [
  {
    label: "Shift",
    url: "https://docs.google.com/spreadsheets/d/1FEU1wA1Rzp_FU4h4OQ7qhreawlsOqwUdqY2z9rs6e_E/edit?gid=268657057#gid=268657057",
  },
];

const storeList: SheetItem[] = [
  {
    label: "店舗一覧",
    url: "https://docs.google.com/spreadsheets/d/1FEU1wA1Rzp_FU4h4OQ7qhreawlsOqwUdqY2z9rs6e_E/edit?gid=268657057#gid=268657057",
  },
];

function toSpreadsheetEmbedUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/\/spreadsheets\/d\/([^/?#]+)/);
  const gidMatch = trimmed.match(/[?&#]gid=([^&#]+)/);

  if (!match?.[1]) return trimmed;

  const gid = gidMatch?.[1];
  const gidPart = gid ? `?gid=${gid}` : "";

  return `https://docs.google.com/spreadsheets/d/${match[1]}/preview${gidPart}`;
}

export default function SpreadsheetPage() {
  const isShiftPage = window.location.pathname.includes("/shift");
  const isStorePage = window.location.pathname.includes("/stores");
  const isMeasurementPage = window.location.pathname.includes("/measurement-values");

  const pageList = useMemo(() => {
    if (isMeasurementPage) return [measurementSheet];
    if (isShiftPage) return shiftList;
    if (isStorePage) return storeList;
    return storeList;
  }, [isMeasurementPage, isShiftPage, isStorePage]);

  const [currentUrl, setCurrentUrl] = useState(pageList[0]?.url ?? "");
  const [currentLabel, setCurrentLabel] = useState(pageList[0]?.label ?? "Spreadsheet");
  const [height, setHeight] = useState(900);
  const [zoom, setZoom] = useState(100);

  const embedUrl = toSpreadsheetEmbedUrl(currentUrl);
  const iframeHeight = `${height / (zoom / 100)}px`;

  const title = isMeasurementPage
    ? "メジャメント数値"
    : isShiftPage
      ? "Shift"
      : "店舗一覧";

  const openSheet = () => {
    if (currentUrl) {
      window.open(currentUrl, "_blank", "noopener,noreferrer");
    }
  };

  const resetSize = () => {
    setHeight(900);
    setZoom(100);
  };

  const selectSheet = (item: SheetItem) => {
    setCurrentLabel(item.label);
    setCurrentUrl(item.url);
  };

  return (
    <div className="space-y-6">
      <div className="glitch-text text-3xl font-bold text-primary" data-text={title}>
        {title}
      </div>
      <p className="mono-sub text-2xl">// SPREADSHEET_VIEW</p>

      <section className="cyber-border rounded-lg p-4 bg-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">{currentLabel}</h2>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={openSheet}
              className="px-4 py-2 rounded-md border border-border hover:bg-muted"
            >
              別タブで開く
            </button>

            <button
              onClick={resetSize}
              className="px-4 py-2 rounded-md border border-border hover:bg-muted"
            >
              サイズ初期化
            </button>
          </div>
        </div>

        {pageList.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {pageList.map((item) => (
              <button
                key={item.label}
                onClick={() => selectSheet(item)}
                className={`px-3 py-2 rounded-md border border-border ${
                  currentLabel === item.label ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">高さ</span>
            <div className="rounded-md border border-border bg-input p-3">
              <div className="flex items-center justify-between text-sm">
                <span>表示高さ</span>
                <span className="font-semibold text-primary">{height}px</span>
              </div>
              <input
                type="range"
                min="500"
                max="1400"
                value={height}
                onChange={(event) => setHeight(Number(event.target.value))}
                className="w-full"
              />
            </div>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">表示倍率</span>
            <div className="rounded-md border border-border bg-input p-3">
              <div className="flex items-center justify-between text-sm">
                <span>倍率</span>
                <span className="font-semibold text-primary">{zoom}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full"
              />
            </div>
          </label>
        </div>

        <iframe
          title={currentLabel}
          src={embedUrl}
          className="w-full rounded-md border border-border bg-background"
          style={{
            height: iframeHeight,
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top left",
            width: `${100 / (zoom / 100)}%`,
          }}
        />
      </section>
    </div>
  );
}
