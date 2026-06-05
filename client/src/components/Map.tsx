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

type MapViewProps = {
  className?: string;
  initialCenter?: LatLng;
  initialZoom?: number;
  currentLocation?: LatLng | null;
  destination?: LatLng | null;
  route?: LatLng[];
};

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

        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]} />
        )}

        {destination && (
          <Marker position={[destination.lat, destination.lng]} />
        )}

        {route.length > 0 && (
          <Polyline positions={route.map((p) => [p.lat, p.lng])} />
        )}
      </MapContainer>
    </div>
  );
}
