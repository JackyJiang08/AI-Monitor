"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import the map component with SSR disabled
// This is necessary because Leaflet uses window object which is not available during SSR
const MapContent = dynamic(() => import("./map/MapContent"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full bg-slate-900 rounded-none" />
});

export default MapContent;
