export default function MeasurementValuesPage() {
  const sheetUrl =
    "https://docs.google.com/spreadsheets/d/1FEU1wA1Rzp_FU4h4OQ7qhreawlsOqwUdqY2z9rs6e_E/preview?gid=268657057";

  return (
    <div className="space-y-6">
      <div className="glitch-text text-3xl font-bold text-primary" data-text="メジャメント数値">
        メジャメント数値
      </div>
      <p className="mono-sub text-2xl">// SPREADSHEET_VIEW</p>

      <section className="cyber-border rounded-lg p-4 bg-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">メジャメント数値</h2>

          <button
            onClick={() =>
              window.open(
                "https://docs.google.com/spreadsheets/d/1FEU1wA1Rzp_FU4h4OQ7qhreawlsOqwUdqY2z9rs6e_E/edit?gid=268657057#gid=268657057",
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="px-4 py-2 rounded-md border border-border hover:bg-muted"
          >
            別タブで開く
          </button>
        </div>

        <iframe
          title="メジャメント数値"
          src={sheetUrl}
          className="w-full h-[900px] rounded-md border border-border bg-background"
        />
      </section>
    </div>
  );
}
