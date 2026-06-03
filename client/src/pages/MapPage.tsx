import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { useState, useRef, useCallback } from "react";
import { MapPin, Search, Navigation, Star, AlertCircle, X } from "lucide-react";

type SearchResult = {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  types: string[];
};

export default function MapPage() {
  const [addressInput, setAddressInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Geocoding (address → coordinates)
  const { data: geocodeResult, isLoading: geocodeLoading, error: geocodeError } = trpc.maps.geocode.useQuery(
    { address: searchTerm },
    { enabled: searchTerm.length > 0 }
  );

  // Place search
  const { data: placesResult, isLoading: placesLoading } = trpc.maps.searchPlaces.useQuery(
    { query: placeQuery },
    { enabled: placeQuery.length > 0 }
  );

  const clearMarkers = () => {
    markersRef.current.forEach((m) => {
      m.map = null;
    });
    markersRef.current = [];
  };

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (mapCenter) {
      map.setCenter(mapCenter);
      map.setZoom(15);
    }
  }, [mapCenter]);

  const flyToLocation = (lat: number, lng: number, zoom = 15) => {
    if (mapRef.current) {
      mapRef.current.setCenter({ lat, lng });
      mapRef.current.setZoom(zoom);
      clearMarkers();
      const marker = new window.google!.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat, lng },
      });
      markersRef.current.push(marker);
    } else {
      setMapCenter({ lat, lng });
    }
  };

  const handleAddressSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    setSearchTerm(addressInput.trim());
    setPlaceQuery("");
  };

  const handlePlaceSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    setPlaceQuery(addressInput.trim());
    setSearchTerm("");
  };

  // Auto-fly when geocode result arrives
  if (geocodeResult?.results?.[0] && searchTerm) {
    const loc = geocodeResult.results[0].geometry.location;
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      if (!center || Math.abs(center.lat() - loc.lat) > 0.001 || Math.abs(center.lng() - loc.lng) > 0.001) {
        flyToLocation(loc.lat, loc.lng);
      }
    }
  }

  const placeResults: SearchResult[] = (placesResult?.results ?? []) as SearchResult[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          <span className="glitch-text" data-text="マップ">マップ</span>
        </h1>
        <p className="mono-sub">// MAP_EXPLORER</p>
      </div>

      {/* Search Controls */}
      <div className="cyber-border rounded-lg p-4 bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">住所・場所を検索</span>
        </div>
        <form className="flex gap-2">
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="住所または場所名を入力（例：東京都渋谷区、Telexistence）"
            className="flex-1 px-3 py-2 rounded-md bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            onClick={handleAddressSearch}
            className="px-3 py-2 rounded-md bg-primary/20 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/30 transition-colors flex items-center gap-1.5"
          >
            <Navigation className="h-3.5 w-3.5" />
            住所
          </button>
          <button
            type="submit"
            onClick={handlePlaceSearch}
            className="px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-1.5"
          >
            <MapPin className="h-3.5 w-3.5" />
            スポット
          </button>
        </form>
      </div>

      {/* Geocode Result */}
      {searchTerm && (
        <div className="cyber-border rounded-lg p-3 bg-card">
          {geocodeLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              検索中...
            </div>
          )}
          {geocodeError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {geocodeError.message}
            </div>
          )}
          {geocodeResult?.results?.[0] && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{geocodeResult.results[0].formatted_address}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {geocodeResult.results[0].geometry.location.lat.toFixed(6)}, {geocodeResult.results[0].geometry.location.lng.toFixed(6)}
                </p>
              </div>
              <button
                onClick={() => {
                  const loc = geocodeResult.results[0].geometry.location;
                  flyToLocation(loc.lat, loc.lng);
                }}
                className="text-xs text-primary hover:underline shrink-0"
              >
                地図で見る
              </button>
            </div>
          )}
          {geocodeResult?.status === "ZERO_RESULTS" && (
            <p className="text-sm text-muted-foreground">該当する住所が見つかりませんでした</p>
          )}
        </div>
      )}

      {/* Places Results */}
      {placeQuery && placeResults.length > 0 && (
        <div className="space-y-2">
          <p className="mono-sub">{placeResults.length} 件のスポット</p>
          <div className="space-y-1">
            {placeResults.map((place) => (
              <div
                key={place.place_id}
                className={`cyber-border rounded-lg p-3 bg-card cursor-pointer hover:bg-primary/5 transition-colors ${
                  selectedResult?.place_id === place.place_id ? "border-primary/50 bg-primary/5" : ""
                }`}
                onClick={() => {
                  setSelectedResult(place);
                  flyToLocation(place.geometry.location.lat, place.geometry.location.lng);
                }}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{place.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{place.formatted_address}</p>
                    {place.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-muted-foreground">
                          {place.rating} ({place.user_ratings_total?.toLocaleString()}件)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {placesLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
        </div>
      )}

      {/* Selected Place Detail */}
      {selectedResult && (
        <div className="cyber-border rounded-lg p-4 bg-card space-y-2 border-primary/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{selectedResult.name}</span>
            </div>
            <button
              onClick={() => setSelectedResult(null)}
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{selectedResult.formatted_address}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {selectedResult.geometry.location.lat.toFixed(6)}, {selectedResult.geometry.location.lng.toFixed(6)}
          </p>
        </div>
      )}

      {/* Map */}
      <div className="cyber-border rounded-lg overflow-hidden">
        <MapView
          className="w-full h-[500px]"
          initialCenter={mapCenter ?? { lat: 35.6762, lng: 139.6503 }}
          initialZoom={12}
          onMapReady={handleMapReady}
        />
      </div>
    </div>
  );
}
