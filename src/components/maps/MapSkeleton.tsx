import React from "react";

export function MapSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex h-[500px] w-full animate-pulse flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-100 p-6 ${className}`}
      role="status"
      aria-label="Loading interactive map"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 text-3xl shadow-sm">
        🗺️
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500">
        Loading live tracking map…
      </p>
    </div>
  );
}

export default MapSkeleton;
