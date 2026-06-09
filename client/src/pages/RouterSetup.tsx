import { useState } from "react";

type StoreType = "SEJ" | "FM";

type StaticDevice = {
  name: string;
  ip: string;
};

export default function RouterSetup() {
  const [storeType, setStoreType] = useState<StoreType>("SEJ");
  const [ssid, setSsid] = useState("TX-SCARA");
  const [wifiPassword, setWifiPassword] = useState("Telexistence2017");
  const [routerUrl, setRouterUrl] = useState("http://192.168.200.1");

  const networkBasicUrl = "http://192.168.200.1/#networkBasic";
  const dhcpServerAdvUrl = "http://192.168.200.1/#dhcpServerAdv";

  const devices: StaticDevice[] = [
    { name: "Robot", ip: "192.168.200.8" },
    { name: "PICO", ip: "192.168.200.90" },
    { name: "Front Cam / FC", ip: "192.168.200.60" },
    { name: "Back Cam / BC", ip: "192.168.200.61" },
  ];

  const fixedIpText = devices
    .map((device) => `${device.name}: ${device.ip}`)
    .join("\n");

  const settingText = `
[TP-Link Router Settings]

Store Type: ${storeType}

[Common]
SSID: ${ssid}
Wi-Fi Password: ${wifiPassword}
Router URL: ${routerUrl}

[Internet Setting]
${storeType === "SEJ"
  ? `Connection Type: 静的IP
IP Address: 192.168.97.9
Subnet Mask: 255.255.255.0
Gateway: 192.168.97.1
Primary DNS: 8.8.8.8
Secondary DNS: 1.1.1.1`
  : `Connection Type: V6プラス`
}

[Fixed IP]
${fixedIpText}
`.trim();

  const openRouter = () => {
    window.open(routerUrl, "_blank", "noopener,noreferrer");
  };

  const showNetworkBasicPage = () => {
    window.open(networkBasicUrl, "_blank", "noopener,noreferrer");
  };

  const showDhcpServerAdvPage = () => {
    window.open(dhcpServerAdvUrl, "_blank", "noopener,noreferrer");
  };

  const copySettings = async () => {
    await navigator.clipboard.writeText(settingText);
    alert("設定値をコピーしました");
  };

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    alert(`${value} をコピーしました`);
  };

return (
    <div className="space-y-6">
      <div className="glitch-text text-3xl font-bold text-primary" data-text="Router Setup">
        Router Setup
      </div>
      <p className="mono-sub text-2xl">// TP_LINK_CONFIGURATION_HELPER</p>

      <section className="cyber-border rounded-lg p-4 bg-card space-y-4">
        <h2 className="text-xl font-semibold text-foreground">TP-Link ルーター設定</h2>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={openRouter}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
          >
            TP-Link管理画面を開く
          </button>

          <button
            onClick={copySettings}
            className="px-4 py-2 rounded-md border border-border hover:bg-muted"
          >
            設定値をコピー
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm text-muted-foreground">店舗タイプ</span>
            <select
              className="w-full px-3 py-2 rounded-md bg-input border border-border"
              value={storeType}
              onChange={(e) => setStoreType(e.target.value as StoreType)}
            >
              <option value="SEJ">SEJ</option>
              <option value="FM">FM</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">SSID</span>
            <input
              className="w-full px-3 py-2 rounded-md bg-input border border-border"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">Wi-Fi Password</span>
            <input
              className="w-full px-3 py-2 rounded-md bg-input border border-border"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm text-muted-foreground">ルーター設定ページ</span>
            <input
              className="w-full px-3 py-2 rounded-md bg-input border border-border"
              value={routerUrl}
              onChange={(e) => setRouterUrl(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">
            {storeType === "SEJ" ? "SEJネットワーク設定" : "FMネットワーク設定"}
          </h2>

          <button
            onClick={showNetworkBasicPage}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
          >
            設定画面を開く
          </button>
        </div>

        {storeType === "SEJ" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-input p-3">
              <div className="text-sm text-muted-foreground">インターネット接続タイプ</div>
              <button type="button" onClick={() => copyValue("静的IP")} className="font-semibold text-left hover:underline">静的IP</button>
            </div>
            <div className="rounded-md border border-border bg-input p-3">
              <div className="text-sm text-muted-foreground">IPアドレス</div>
              <button type="button" onClick={() => copyValue("192.168.97.9")} className="font-semibold text-left hover:underline">192.168.97.9</button>
            </div>
            <div className="rounded-md border border-border bg-input p-3">
              <div className="text-sm text-muted-foreground">サブネットマスク</div>
              <button type="button" onClick={() => copyValue("255.255.255.0")} className="font-semibold text-left hover:underline">255.255.255.0</button>
            </div>
            <div className="rounded-md border border-border bg-input p-3">
              <div className="text-sm text-muted-foreground">ゲートウェイ</div>
              <button type="button" onClick={() => copyValue("192.168.97.1")} className="font-semibold text-left hover:underline">192.168.97.1</button>
            </div>
            <div className="rounded-md border border-border bg-input p-3">
              <div className="text-sm text-muted-foreground">プライマリーDNS</div>
              <button type="button" onClick={() => copyValue("8.8.8.8")} className="font-semibold text-left hover:underline">8.8.8.8</button>
            </div>
            <div className="rounded-md border border-border bg-input p-3">
              <div className="text-sm text-muted-foreground">セカンダリーDNS</div>
              <button type="button" onClick={() => copyValue("1.1.1.1")} className="font-semibold text-left hover:underline">1.1.1.1</button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-input p-3">
            <div className="text-sm text-muted-foreground">インターネット接続タイプ</div>
            <button type="button" onClick={() => copyValue("V6プラス")} className="font-semibold text-left hover:underline">V6プラス</button>
          </div>
        )}
      </section>

      <section className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-foreground">固定IPリスト</h2>

          <button
            onClick={showDhcpServerAdvPage}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
          >
            設定画面を開く
          </button>
        </div>

        <div className="space-y-2">
          {devices.map((device) => (
            <div key={device.name} className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                className="px-3 py-2 rounded-md bg-input border border-border"
                value={device.name}
                readOnly
              />
              <button
                type="button"
                onClick={() => copyValue(device.ip)}
                className="px-3 py-2 rounded-md bg-input border border-border text-left font-semibold hover:bg-muted"
                title="クリックでコピー"
              >
                {device.ip}
              </button>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          固定IPはPDF手順に合わせて固定です。IPアドレスをクリックすると個別にコピーできます。
        </p>
      </section>
    </div>
  );
}


