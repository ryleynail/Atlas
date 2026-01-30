"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from './components/SearchBar';

// Dynamically import Map to avoid SSR issues with mapbox-gl.
const Map = dynamic(() => import('./components/Map'), { ssr: false });

export default function HomePage() {
  const [viewMode, setViewMode] = useState<'on-market' | 'off-market'>('on-market');

  return (
    <div className="relative h-screen w-screen">
      {/* Logo */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-2">
        <img src="/logo.png" alt="Atlas logo" className="h-8 w-8" />
        <span className="font-semibold text-gold text-lg">Atlas</span>
      </div>

      {/* Search bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md px-4">
        <SearchBar />
      </div>

      {/* Mode toggle */}
      <div className="absolute top-4 right-4 z-20 bg-background border border-gold rounded px-2 py-1 flex items-center space-x-2">
        <label htmlFor="viewMode" className="text-sm text-gold">Mode</label>
        <select
          id="viewMode"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as any)}
          className="bg-background text-gold outline-none"
        >
          <option value="on-market">Active Listings</option>
          <option value="off-market">Deep Intelligence</option>
        </select>
      </div>

      {/* Map container */}
      <div className="h-full w-full">
        <Map viewMode={viewMode} />
      </div>
    </div>
  );
}