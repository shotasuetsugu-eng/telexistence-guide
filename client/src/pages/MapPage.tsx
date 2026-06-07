import { FormEvent, useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/Map";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ExternalLink, LocateFixed, MapPin, Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";

type LatLng = { lat: number; lng: number };

type ConvenienceStore = {
  chain: "7-Eleven" | "FamilyMart" | "Lawson";
  name: string;
  address: string;
  mapsUrl: string;
  location: LatLng;
};

const defaultStores: ConvenienceStore[] = [
  {
    chain: "7-Eleven",
    name: "セブン-イレブン 丸の内センタービル店",
    address: "東京都千代田区丸の内1-6-1",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=35.6838,139.7651",
    location: { lat: 35.6838, lng: 139.7651 },
  },
  {
    chain: "7-Eleven",
    name: "セブン-イレブン 東京駅日本橋口店",
    address: "東京都千代田区丸の内1-9-1",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=35.6824,139.7691",
    location: { lat: 35.6824, lng: 139.7691 },
  },
  {
    chain: "FamilyMart",
    name: "ファミリーマート 丸の内オアゾ店",
    address: "東京都千代田区丸の内1-6-4",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=35.6832,139.766",
    location: { lat: 35.6832, lng: 139.766 },
  },
  {
    chain: "FamilyMart",
    name: "ファミリーマート 八重洲一丁目店",
    address: "東京都中央区八重洲1-5-9",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=35.6812,139.7712",
    location: { lat: 35.6812, lng: 139.7712 },
  },
  {
    chain: "Lawson",
    name: "ローソン 丸の内二重橋前店",
    address: "東京都千代田区丸の内2-3-1",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=35.6805,139.7617",
    location: { lat: 35.6805, lng: 139.7617 },
  },
  {
    chain: "Lawson",
    name: "ローソン 東京駅八重洲中央口店",
    address: "東京都千代田区丸の内1-9-1",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=35.681,139.7681",
    location: { lat: 35.681, lng: 139.7681 },
  },
];

const chains = ["7-Eleven", "FamilyMart", "Lawson"] as const;
const storageKey = "tx.convenience.stores";

function normalizeUrl(url: string) {
  const value = url.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function getLocationFromMapsUrl(url: string): LatLng | null {
  const decoded = decodeURIComponent(url);
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]destination=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) return { lat: Number(match[1]), lng: Number(match[2]) };
  }
  return null;
}

function getStoreNameFromMapsUrl(url: string) {
  try {
    const decoded = decodeURIComponent(url);
    const placeMatch = decoded.match(/\/place\/([^/@?]+)/);
    if (placeMatch?.[1]) return placeMatch[1].replace(/\+/g, " ").trim();

    const parsed = new URL(normalizeUrl(url));
    const query = parsed.searchParams.get("query") || parsed.searchParams.get("q");
    if (query && !/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(query)) {
      return query.replace(/\+/g, " ").trim();
    }
  } catch {}
  return "";
}

function loadStores() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved) as ConvenienceStore[];
  } catch {}
  return defaultStores;
}

export default function MapPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeChain, setActiveChain] = useState<ConvenienceStore["chain"]>("7-Eleven");
  const [stores, setStores] = useState<ConvenienceStore[]>(defaultStores);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [selectedStore, setSelectedStore] = useState<ConvenienceStore>(defaultStores[0]);
  const [status, setStatus] = useState("");
  const [newChain, setNewChain] = useState<ConvenienceStore["chain"]>("7-Eleven");
  const [newMapsUrl, setNewMapsUrl] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const resolveMapsUrlMutation = trpc.maps.resolveGoogleMapsUrl.useMutation({
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    const loadedStores = loadStores();
    setStores(loadedStores);
    setSelectedStore(loadedStores[0] ?? defaultStores[0]);
  }, []);

  const saveStores = (nextStores: ConvenienceStore[]) => {
    setStores(nextStores);
    window.localStorage.setItem(storageKey, JSON.stringify(nextStores));
  };

  const visibleStores = useMemo(
    () => stores.filter((store) => store.chain === activeChain),
    [stores, activeChain]
  );

  const showCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus("現在地を取得しました");
      },
      () => setStatus("現在地を取得できませんでした"),
      { enableHighAccuracy: true }
    );
  };

  const openGoogleRoute = (store: ConvenienceStore) => {
    setSelectedStore(store);
    const destination = encodeURIComponent(
      store.location ? `${store.location.lat},${store.location.lng}` : `${store.name} ${store.address}`
    );
    const origin = currentLocation
      ? `&origin=${currentLocation.lat},${currentLocation.lng}`
      : "";
    window.open(
      `https://www.google.com/maps/dir/?api=1${origin}&destination=${destination}&travelmode=walking`,
      "_blank"
    );
  };

  const selectStore = (store: ConvenienceStore) => {
    setSelectedStore(store);
    setStatus(`${store.name} を選択しました`);
  };

  const addStore = async (event: FormEvent) => {
    event.preventDefault();
    const mapsUrl = normalizeUrl(newMapsUrl);
    if (!mapsUrl) {
      toast.error("Googleマップリンクを入力してください");
      return;
    }

    const resolved = await resolveMapsUrlMutation.mutateAsync({ url: mapsUrl });
    const autoName = resolved.name || getStoreNameFromMapsUrl(mapsUrl);
    const location = resolved.location ?? getLocationFromMapsUrl(mapsUrl) ?? selectedStore.location;
    const nextStore: ConvenienceStore = {
      chain: newChain,
      name: autoName || "店舗名未取得",
      address: autoName || "Googleマップリンクから登録",
      mapsUrl: resolved.url,
      location,
    };
    saveStores([...stores, nextStore]);
    setSelectedStore(nextStore);
    setActiveChain(newChain);
    setNewMapsUrl("");
    toast.success("店舗リンクを追加しました");
  };

  const deleteStore = (storeName: string) => {
    const nextStores = stores.filter((store) => store.name !== storeName);
    saveStores(nextStores);
    const fallback = nextStores.find((store) => store.chain === activeChain) ?? nextStores[0] ?? defaultStores[0];
    setSelectedStore(fallback);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="コンビニマップ">コンビニマップ</span>
        </h1>
        <p className="mono-sub">// CONVENIENCE_STORE_ROUTE</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <button
            onClick={showCurrentLocation}
            className="w-full cyber-border rounded-lg p-3 bg-card flex items-center justify-center gap-2 text-sm text-primary hover:bg-primary/10 transition-colors"
          >
            <LocateFixed className="h-4 w-4" />
            現在地を使う
          </button>

          <div className="grid grid-cols-2 gap-2">
            {chains.map((chain) => (
              <button
                key={chain}
                onClick={() => {
                  setActiveChain(chain);
                  const first = stores.find((store) => store.chain === chain);
                  if (first) setSelectedStore(first);
                }}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  activeChain === chain
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {chain}
              </button>
            ))}
          </div>

        <div className="cyber-border rounded-lg bg-card p-3">
          <input
            type="text"
            value={storeSearch}
            onChange={(event) => setStoreSearch(event.target.value)}
            placeholder="登録済み店舗名・住所で検索"
            className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          {storeSearch.trim() && (
            <p className="text-xs text-muted-foreground mt-2">
              検索結果：{visibleStores.length}件
            </p>
          )}
        </div>

          <div className="space-y-2">
            {visibleStores.map((store) => (
              <div key={store.name} className="cyber-border rounded-lg bg-card p-3 space-y-2">
                <button
                  onClick={() => selectStore(store)}
                  className="w-full text-left flex items-start gap-3"
                >
                  <Store className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">{store.name}</span>
                    <span className="block text-xs text-muted-foreground mt-1">{store.address}</span>
                  </span>
                </button>
                <button
                  onClick={() => openGoogleRoute(store)}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Googleマップで経路表示
                </button>
                {isAdmin && (
                  <button
                    onClick={() => deleteStore(store.name)}
                    className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <form onSubmit={addStore} className="cyber-border rounded-lg bg-card p-3 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Plus className="h-4 w-4 text-primary" />
                店舗リンク追加
              </div>
              <select
                value={newChain}
                onChange={(event) => setNewChain(event.target.value as ConvenienceStore["chain"])}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
              >
                {chains.map((chain) => <option key={chain} value={chain}>{chain}</option>)}
              </select>
              <input
                value={newMapsUrl}
                onChange={(event) => setNewMapsUrl(event.target.value)}
                placeholder="Googleマップリンク"
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm" disabled={resolveMapsUrlMutation.isPending}>
                {resolveMapsUrlMutation.isPending ? "取得中..." : "追加"}
              </Button>
            </form>
          )}

          {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </div>

      <div className="space-y-3">
        <div className="cyber-border rounded-lg bg-card p-3 space-y-2">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{selectedStore.name}</p>
              <p className="text-xs text-muted-foreground">{selectedStore.address}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-8">
            <button
              type="button"
              onClick={() => openGoogleRoute(selectedStore)}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Googleマップで経路表示
            </button>

            {isAdmin && stores.some((store) => store.name === selectedStore.name) && (
              <button
                type="button"
                onClick={() => deleteStore(selectedStore.name)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                削除
              </button>
            )}
          </div>
        </div>

        <div className="h-[560px] overflow-hidden rounded-lg border border-border">
          <MapView
            className="h-full w-full"
            initialCenter={selectedStore.location}
            initialZoom={16}
            currentLocation={currentLocation}
            destination={selectedStore.location}
            route={[]}
          />
        </div>
      </div>
      </div>
    </div>
  );
}






