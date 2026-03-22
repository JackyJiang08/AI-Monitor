"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvent } from "react-leaflet";
import L from "leaflet";
import { useAppStore } from "@/lib/store";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapContentProps {
  hoveredEventId?: string | null;
  shouldResetZoom?: boolean;
  onZoomReset?: () => void;
}

// Separate component to handle coordinates rendering internally to prevent MapContainer re-renders
function CoordinateTracker() {
  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  
  useMapEvent('mousemove', (e) => {
    setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
  });

  const formatCoordinate = (value: number, posLabel: string, negLabel: string) => {
    const label = value >= 0 ? posLabel : negLabel;
    const absVal = Math.abs(value);
    const degrees = Math.floor(absVal);
    const minutes = ((absVal - degrees) * 60).toFixed(2);
    return `${degrees}° ${minutes} ${label}`;
  };

  return (
    <div className="absolute right-6 bottom-6 z-[1000] pointer-events-auto bg-white/80 backdrop-blur-md border border-black/10 rounded px-4 py-2 font-mono text-[10px] text-black text-right shadow-md">
      <div>{formatCoordinate(coords.lat, 'N', 'S')}</div>
      <div>{formatCoordinate(coords.lng, 'E', 'W')}</div>
      <div className="text-black/50 mt-1">
        ({coords.lat.toFixed(6)}, {coords.lng.toFixed(6)})
      </div>
    </div>
  );
}

// Custom hook to handle map programmatic movement
function MapController({ hoveredEventId, shouldResetZoom, onZoomReset }: { 
  hoveredEventId?: string | null, 
  shouldResetZoom?: boolean,
  onZoomReset?: () => void
}) {
  const map = useMap();
  const events = useAppStore(state => state.events);

  useEffect(() => {
    if (shouldResetZoom) {
      map.flyTo([20, 0], 2, { duration: 1.5 });
      if (onZoomReset) onZoomReset();
    }
  }, [shouldResetZoom, map, onZoomReset]);

  useEffect(() => {
    if (hoveredEventId) {
      const event = events.find(e => e.id === hoveredEventId);
      if (event) {
        map.flyTo([event.coordinates[1], event.coordinates[0]], 5, { duration: 1.5 });
      }
    }
  }, [hoveredEventId, map, events]);

  return null;
}

const createCustomIcon = (severity: string, size: number = 14) => {
  // Reduce sizes by half to make them much smaller and cleaner
  const reducedSize = Math.max(6, Math.round(size * 0.5));
  
  let color = "";
  let glow = "";
  switch (severity) {
    case "CRITICAL":
      color = "rgba(239, 68, 68, 0.5)"; // red with 50% opacity
      glow = "rgba(239, 68, 68, 0.4)";
      break;
    case "HIGH":
      color = "rgba(249, 115, 22, 0.5)"; // orange with 50% opacity
      glow = "rgba(249, 115, 22, 0.4)";
      break;
    case "ELEVATED":
      color = "rgba(234, 179, 8, 0.5)"; // yellow with 50% opacity
      glow = "rgba(234, 179, 8, 0.4)";
      break;
    case "MODERATE":
      color = "rgba(132, 204, 22, 0.5)"; // light green with 50% opacity
      glow = "rgba(132, 204, 22, 0.4)";
      break;
    case "LOW":
    default:
      color = "rgba(34, 197, 94, 0.5)"; // green with 50% opacity
      glow = "rgba(34, 197, 94, 0.4)";
      break;
  }
  
  return L.divIcon({
    className: "bg-transparent border-0",
    html: `
      <div class="relative flex items-center justify-center pointer-events-none">
        <div class="absolute animate-ping rounded-full" style="width: ${reducedSize * 2}px; height: ${reducedSize * 2}px; background-color: ${glow};"></div>
        <div class="relative rounded-full border border-black/30 shadow-sm" style="width: ${reducedSize}px; height: ${reducedSize}px; background-color: ${color}; box-shadow: 0 0 8px ${color};"></div>
      </div>
    `,
    iconSize: [reducedSize * 2, reducedSize * 2],
    iconAnchor: [reducedSize, reducedSize],
    popupAnchor: [0, -reducedSize],
  });
};

export default function MapContent({ hoveredEventId, shouldResetZoom, onZoomReset }: MapContentProps) {
  const tileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const events = useAppStore(state => state.events);
  const fetchLiveNews = useAppStore(state => state.fetchLiveNews);

  useEffect(() => {
    fetchLiveNews();
  }, [fetchLiveNews]);

  // Filter events to only show those within the last 48 hours
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const recentEvents = events.filter(event => {
    if (!event.publishedAt) return false;
    const pubDate = new Date(event.publishedAt).getTime();
    return (now - pubDate) <= 48 * 60 * 60 * 1000; // 48 hours in milliseconds
  });

  return (
    <MapContainer 
      center={[20, 0]} 
      zoom={2} 
      zoomControl={false}
      attributionControl={false}
      className="w-full h-full"
      style={{ backgroundColor: '#f8fafc' }}
      minZoom={2}
      maxBounds={[[-90, -18000], [90, 18000]]}
      maxBoundsViscosity={1.0}
      worldCopyJump={true}
    >
      <TileLayer url={tileUrl} />
      
      <MapController 
        hoveredEventId={hoveredEventId} 
        shouldResetZoom={shouldResetZoom} 
        onZoomReset={onZoomReset} 
      />

      <CoordinateTracker />

      {recentEvents.map((event) => {
        // Create an array of markers to render at multiple longitudes to ensure they show up when wrapping
        // Render at normal longitude, plus several worlds to the left and right to ensure full infinite scrolling
        const wrapOffsets = [-1080, -720, -360, 0, 360, 720, 1080];
        
        return wrapOffsets.map((offset, index) => (
          <Marker 
            key={`${event.id}-${index}`}
            position={[event.coordinates[1], event.coordinates[0] + offset]}
            icon={createCustomIcon(event.severity, event.size)}
            eventHandlers={{
              click: (e) => {
                const map = e.target._map;
                map.flyTo([event.coordinates[1], event.coordinates[0] + offset], 5, { duration: 1.5 });
              }
            }}
          >
            <Popup className="custom-popup" closeButton={true} minWidth={320} maxWidth={400}>
                <div className="flex flex-col gap-2 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      event.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      event.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      event.severity === 'ELEVATED' ? 'bg-yellow-100 text-yellow-700' :
                      event.severity === 'MODERATE' ? 'bg-lime-100 text-lime-700' :
                      'bg-green-100 text-green-700'
                    }`}>{event.severity}</span>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{event.entityType}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{event.timeAgo}</span>
                  </div>
                  
                  <div className="flex items-start justify-between gap-4 mt-1">
                    <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors group flex-1">
                      <h3 className="font-bold text-base leading-tight text-black group-hover:underline decoration-black/30 underline-offset-2">{event.title}</h3>
                    </a>
                    {event.sourceUrl && (
                      <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 border-black/20 hover:bg-black/5 text-black">
                          Read <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>

                  {event.summary && (
                    <p className="text-sm text-black/80 mt-2">{event.summary}</p>
                  )}

                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                      {event.industry}
                    </span>
                    {event.category && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">
                        {event.category}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">&middot; {event.location}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ));
        })}
    </MapContainer>
  );
}
