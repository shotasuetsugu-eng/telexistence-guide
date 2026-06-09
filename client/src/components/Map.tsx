import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type LatLng = { lat: number; lng: number };

type ConvenienceStore = {
  id?: number;
  chain: "7-Eleven" | "FamilyMart" | "Lawson";
  name: string;
  address: string;
  mapsUrl: string;
  location: LatLng;
};

type MapViewProps = {
  className?: string;
  initialCenter?: LatLng;
  initialZoom?: number;
  currentLocation?: LatLng | null;
  destination?: LatLng | null;
  route?: LatLng[];
  stores?: ConvenienceStore[];
  selectedStore?: ConvenienceStore | null;
  onSelectStore?: (store: ConvenienceStore) => void;
};

const logoUrlByChain: Record<ConvenienceStore["chain"], string> = {
  "7-Eleven": "/map-icons/seven-eleven.png",
  FamilyMart: "/map-icons/familymart.png",
  Lawson: "/map-icons/lawson.png",
};

function isSameStore(a?: ConvenienceStore | null, b?: ConvenienceStore | null) {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  return a.name === b.name && a.mapsUrl === b.mapsUrl;
}

function getStoreLogoIcon(chain: ConvenienceStore["chain"], isSelected: boolean) {
  const size = isSelected ? 58 : 46;
  const logoUrl = logoUrlByChain[chain];

  return L.divIcon({
    className: "store-logo-marker-wrapper",
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:12px;
        background:#ffffff;
        border:${isSelected ? 4 : 2}px solid ${isSelected ? "#00f5d4" : "#ffffff"};
        box-shadow:0 0 ${isSelected ? 18 : 10}px rgba(0,245,212,0.75);
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      ">
        <img
          src="${logoUrl}"
          alt="${chain}"
          style="
            width:100%;
            height:100%;
            object-fit:contain;
            padding:4px;
            box-sizing:border-box;
          "
        />
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function ChangeView({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);

  return null;
}

export function MapView({
  className,
  initialCenter = { lat: 35.6762, lng: 139.6503 },
  initialZoom = 12,
  currentLocation,
  destination,
  route = [],
  stores = [],
  selectedStore,
  onSelectStore,
}: MapViewProps) {
  return (
    <div className={className}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={initialZoom}
        style={{ height: "100%", width: "100%" }}
      >
        <ChangeView center={initialCenter} zoom={initialZoom} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {stores.length === 0 && currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} />
        )}

        {stores.length === 0 && destination && (
          <Marker position={[destination.lat, destination.lng]} />
        )}

        {stores.map((store, index) => (
          <Marker
            key={`${store.id ?? store.mapsUrl ?? store.name}-${index}`}
            position={[store.location.lat, store.location.lng]}
            icon={getStoreLogoIcon(store.chain, isSameStore(store, selectedStore))}
            eventHandlers={{
              click: () => onSelectStore?.(store),
            }}
          />
        ))}

        {route.length > 0 && (
          <Polyline positions={route.map((p) => [p.lat, p.lng])} />
        )}
      </MapContainer>
    </div>
  );
}
