"use client";

import WorldMap from "@/components/world-map";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 absolute inset-0 bg-background">
      {/* Full Screen World Map */}
      <div className="absolute inset-0 z-0">
        <WorldMap />
      </div>
    </div>
  );
}
