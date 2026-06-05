import { useState } from "react";
import { MapView } from "@/components/Map";

type LatLng = { lat: number; lng: number };
type TravelMode = "driving" | "walking" | "cycling" | "transit";

export default function MapPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<TravelMode>("driving");
  const [mapCenter, setMapCenter] = useState<LatLng>({ lat: 35.6762, lng: 139.6503 });
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destinationName, setDestinationName] = useState("");
  const [route, setRoute] = useState<LatLng[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");

  const modeLabel: Record<TravelMode, string> = {
    driving: "車",
    walking: "徒歩",
    cycling: "自転車",
    transit: "電車",
  };

  const searchLocation = async () => {
    if (!query.trim()) return;

    setStatus("検索中...");
    setSteps([]);
    setRoute([]);
    setArrivalTime("");

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
    );
    const data = await res.json();

    if (!data.length) {
      setStatus("見つかりませんでした");
      return;
    }

    const loc = {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
    };

    setDestination(loc);
    setDestinationName(data[0].display_name);
    setMapCenter(loc);
    setStatus(data[0].display_name);
  };

  const showCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCurrentLocation(loc);
        setMapCenter(loc);
        setStatus("現在地を表示しました");
      },
      () => {
        setStatus("現在地を取得できませんでした");
      },
      { enableHighAccuracy: true }
    );
  };

  const openGoogleNavigation = (travelMode: string) => {
    if (!currentLocation || !destination) {
      setStatus("現在地と目的地を先に設定してください");
      return;
    }

    const url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${currentLocation.lat},${currentLocation.lng}` +
      `&destination=${destination.lat},${destination.lng}` +
      `&travelmode=${travelMode}`;

    window.open(url, "_blank");
  };

  const searchRoute = async () => {
    if (!currentLocation || !destination) {
      setStatus("現在地と目的地を先に設定してください");
      return;
    }

    if (mode === "transit") {
      setStatus("電車ルートはGoogleマップで開きます");
      openGoogleNavigation("transit");
      return;
    }

    setStatus(`${modeLabel[mode]}ルート検索中...`);
    setSteps([]);
    setArrivalTime("");

    const url =
      `https://router.project-osrm.org/route/v1/${mode}/` +
      `${currentLocation.lng},${currentLocation.lat};${destination.lng},${destination.lat}` +
      `?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes?.length) {
      setStatus("経路が見つかりませんでした");
      return;
    }

    const routePoints = data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => ({ lat, lng })
    );

    const routeSteps = data.routes[0].legs[0].steps.map((step: any) => {
      const distance = Math.round(step.distance);
      const name = step.name || "道路";
      const type = step.maneuver.type;
      const modifier = step.maneuver.modifier;

      let action = "進む";
      if (modifier === "left") action = "左折";
      if (modifier === "right") action = "右折";
      if (modifier === "straight") action = "直進";
      if (modifier === "slight left") action = "やや左";
      if (modifier === "slight right") action = "やや右";
      if (modifier === "sharp left") action = "大きく左折";
      if (modifier === "sharp right") action = "大きく右折";
      if (type === "arrive") action = "到着";

      return `${distance}m先、${name}を${action}`;
    });

    const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
    const durationMin = Math.round(data.routes[0].duration / 60);
    const arrival = new Date(Date.now() + data.routes[0].duration * 1000);
    const hh = String(arrival.getHours()).padStart(2, "0");
    const mm = String(arrival.getMinutes()).padStart(2, "0");

    setRoute(routePoints);
    setSteps(routeSteps);
    setMapCenter(currentLocation);
    setArrivalTime(`${hh}:${mm}`);
    setStatus(`${modeLabel[mode]} / 距離: ${distanceKm}km / 目安: ${durationMin}分 / 到着予定: ${hh}:${mm}`);
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">マップ</h1>

      <div className="space-y-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="住所・場所を検索"
          className="w-full rounded border p-3 bg-background"
        />

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as TravelMode)}
          className="w-full rounded border p-3 bg-background"
        >
          <option value="driving">車</option>
          <option value="walking">徒歩</option>
          <option value="cycling">自転車</option>
          <option value="transit">電車 Googleマップで開く</option>
        </select>

        <button onClick={searchLocation} className="w-full rounded border p-3">
          目的地を検索
        </button>

        <button onClick={showCurrentLocation} className="w-full rounded border p-3">
          現在地を表示
        </button>

        <button onClick={searchRoute} className="w-full rounded border p-3">
          経路・到着時間を表示
        </button>

        {arrivalTime && (
          <div className="rounded border p-3">
            <p className="text-sm">到着予定</p>
            <p className="text-2xl font-bold">{arrivalTime}</p>
          </div>
        )}

        {status && <p className="text-sm text-muted-foreground">{status}</p>}
        {destinationName && <p className="text-xs text-muted-foreground">{destinationName}</p>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => openGoogleNavigation("driving")} className="rounded border p-3">
          車でナビ
        </button>
        <button onClick={() => openGoogleNavigation("walking")} className="rounded border p-3">
          徒歩ナビ
        </button>
        <button onClick={() => openGoogleNavigation("transit")} className="rounded border p-3">
          電車ナビ
        </button>
      </div>

      <div className="h-[500px] overflow-hidden rounded-lg border">
        <MapView
          className="h-full w-full"
          initialCenter={mapCenter}
          initialZoom={15}
          currentLocation={currentLocation}
          destination={destination}
          route={route}
        />
      </div>

      {steps.length > 0 && (
        <div className="rounded border p-3 space-y-2">
          <h2 className="font-bold">ナビ案内</h2>
          {steps.map((step, index) => (
            <p key={index} className="text-sm">
              {index + 1}. {step}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
