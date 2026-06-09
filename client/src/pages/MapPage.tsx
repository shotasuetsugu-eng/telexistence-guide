import { FormEvent, useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/Map";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ExternalLink, LocateFixed, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";

type LatLng = { lat: number; lng: number };

type ConvenienceStore = {
  id?: number;
  chain: "7-Eleven" | "FamilyMart" | "Lawson";
  name: string;
  address: string;
  mapsUrl: string;
  location: LatLng;
};

const defaultStores: ConvenienceStore[] = [];

const chains = ["7-Eleven", "FamilyMart", "Lawson"] as const;
const fallbackLocation = { lat: 35.681236, lng: 139.767125 };
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
    if (!saved) return [];

    const parsed = JSON.parse(saved) as ConvenienceStore[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadStoresFromApi(): Promise<ConvenienceStore[]> {
  const response = await fetch("/api/map-stores", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to load map stores");
  }

  const rows = await response.json();

  if (!Array.isArray(rows)) return [];

  return rows.map((row: any) => ({
    id: row.id,
    chain: row.chain || "7-Eleven",
    name: row.name || "店舗名未設定",
    address: row.address || "",
    mapsUrl: row.mapsUrl || row.address || "",
    location: {
      lat: Number(row.lat || 35.681236),
      lng: Number(row.lng || 139.767125),
    },
  }));
}

async function createStoreOnApi(store: ConvenienceStore) {
  const response = await fetch("/api/map-stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chain: store.chain,
      name: store.name,
      address: store.address,
      mapsUrl: store.mapsUrl,
      lat: String(store.location.lat),
      lng: String(store.location.lng),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to create map store");
  }

  return response.json();
}

async function deleteStoreOnApi(id: number) {
  const response = await fetch(`/api/map-stores/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete map store");
  }
}

async function updateStoreNameOnApi(id: number, name: string) {
  const response = await fetch(`/api/map-stores/${id}/name`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) throw new Error("Failed to update map store name");
}
export default function MapPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeChain, setActiveChain] = useState<ConvenienceStore["chain"]>("7-Eleven");
  const [stores, setStores] = useState<ConvenienceStore[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LatLng>(fallbackLocation);
  const [selectedStore, setSelectedStore] = useState<ConvenienceStore | null>(null);
  const [status, setStatus] = useState("");
  const [newChain, setNewChain] = useState<ConvenienceStore["chain"]>("7-Eleven");
  const [newMapsUrl, setNewMapsUrl] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const resolveMapsUrlMutation = trpc.maps.resolveGoogleMapsUrl.useMutation({
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    let isMounted = true;

    const applyLoadedStores = (nextStores: ConvenienceStore[]) => {
      setStores(nextStores);
      window.localStorage.setItem(storageKey, JSON.stringify(nextStores));

      const firstStore = nextStores[0] ?? null;
      setSelectedStore(firstStore);

      if (firstStore) {
        setActiveChain(firstStore.chain);
        setCurrentLocation(firstStore.location);
      }
    };

    const loadMapStores = async () => {
      try {
        const apiStores = await loadStoresFromApi();
        console.log("FORCE_MAP_API_STORES", apiStores);

        if (!isMounted) return;

        if (apiStores.length > 0) {
          applyLoadedStores(apiStores);
          return;
        }

        const localStores = loadStores();
        applyLoadedStores(localStores);
      } catch (error) {
        console.warn("FORCE_MAP_API_STORES_FAILED", error);

        if (!isMounted) return;

        const localStores = loadStores();
        console.log("FORCE_MAP_API_STORES", localStores);
        applyLoadedStores(localStores);
      }
    };

    void loadMapStores();

    return () => {
      isMounted = false;
    };
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

  const updateDisplayName = async (store: ConvenienceStore, value: string) => {
    const nextName = value.trim();

    if (!nextName) {
      toast.error("表示名を入力してください");
      return;
    }

    if (nextName === store.name) return;

    if (store.id) {
      await updateStoreNameOnApi(store.id, nextName);
    }

    const nextStores = stores.map((item) => {
      if (store.id && item.id === store.id) return { ...item, name: nextName };
      if (!store.id && item.name === store.name) return { ...item, name: nextName };
      return item;
    });

    saveStores(nextStores);

    if (
      (selectedStore?.id && selectedStore.id === store.id) ||
      (!selectedStore?.id && selectedStore?.name === store.name)
    ) {
      setSelectedStore({ ...store, name: nextName });
    }

    toast.success("表示名を更新しました");
  };

  const editDisplayName = (store: ConvenienceStore | null) => {
    if (!store) return;

    const nextName = window.prompt("表示名を入力してください", store.name);
    if (nextName === null) return;

    void updateDisplayName(store, nextName);
  };

  const addStore = async (event: FormEvent) => {
    event.preventDefault();

    const mapsUrl = normalizeUrl(newMapsUrl);

    if (!mapsUrl) {
      toast.error("Googleマップリンクを入力してください");
      return;
    }

    let resolved: {
      name?: string;
      address?: string;
      location?: LatLng | null;
    } = {};

    try {
      resolved = await resolveMapsUrlMutation.mutateAsync({ url: mapsUrl });
    } catch (error) {
      console.warn("Google Maps URL resolve failed. Continue with URL fallback.", error);
    }

    const autoName =
      resolved.name ||
      getStoreNameFromMapsUrl(mapsUrl) ||
      "店舗名未設定";

    const nextStore: ConvenienceStore = {
      chain: newChain,
      name: autoName,
      address: resolved.address || mapsUrl,
      mapsUrl,
      location: resolved.location || currentLocation || fallbackLocation,
    };

    // 先に画面へ表示する。API失敗で止めない。
    let savedStore = nextStore;

    try {
      const created = await createStoreOnApi(nextStore);
      savedStore = { ...nextStore, id: created.id };
    } catch (error) {
      console.warn("Map store API save failed. Showing store on screen only.", error);
      toast.error("DB保存に失敗しました。画面には追加します。");
    }

    saveStores([...stores, savedStore]);
    setSelectedStore(savedStore);
    setActiveChain(newChain);
    setNewMapsUrl("");
    toast.success(`店舗リンクを追加しました: ${savedStore.name}`);
  };

  const deleteStore = async (targetStore: ConvenienceStore) => {
    if (targetStore.id) {
      try {
        await deleteStoreOnApi(targetStore.id);
        console.log("MAP_STORE_DELETED", targetStore.id);
      } catch (error) {
        console.warn("Map store API delete failed.", error);
        toast.error("DB削除に失敗しました。リロード後に復活するため、削除を中止しました。");
        return;
      }
    }

    const nextStores = stores.filter((store) => {
      if (targetStore.id) return store.id !== targetStore.id;
      return store !== targetStore;
    });
    saveStores(nextStores);

    const sameChainStores = nextStores.filter((store) => store.chain === activeChain);
    const fallback = sameChainStores[0] ?? nextStores[0] ?? null;

    if (fallback) {
      setSelectedStore(fallback);
      setCurrentLocation(fallback.location);
    } else {
      setSelectedStore(null);
    }
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
              <div key={store.id ?? store.name} className="cyber-border rounded-lg bg-card p-3 space-y-2">
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
                  <div className="inline-flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => editDisplayName(store)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="h-3 w-3" />
                      表示名編集
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStore(store)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      削除
                    </button>
                  </div>
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
              <p className="font-semibold text-foreground">{selectedStore?.name ?? "店舗が選択されていません"}</p>
              <p className="text-xs text-muted-foreground">{selectedStore?.address ?? ""}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-8">
            <button
              type="button"
              onClick={() => selectedStore && openGoogleRoute(selectedStore)}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Googleマップで経路表示
            </button>

            {isAdmin && selectedStore && stores.some((store) => {
              if (selectedStore.id) return store.id === selectedStore.id;
              return store === selectedStore;
            }) && (
              <>
                <button
                  type="button"
                  onClick={() => editDisplayName(selectedStore)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <Pencil className="h-3 w-3" />
                  表示名編集
                </button>
                <button
                  type="button"
                  onClick={() => deleteStore(selectedStore)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  削除
                </button>
              </>
            )}
          </div>
        </div>

        <div className="h-[560px] overflow-hidden rounded-lg border border-border">
          <MapView
            className="h-full w-full"
            initialCenter={selectedStore?.location ?? currentLocation}
            initialZoom={16}
            currentLocation={currentLocation ?? fallbackLocation}
            destination={selectedStore?.location ?? currentLocation}
            route={[]}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
















































