"use client";

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '../../utils/supabaseClient';

// Declare Mapbox token from environment
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface MapProps {
  viewMode: 'on-market' | 'off-market';
}

/**
 * Map component renders a full‑screen Mapbox map and displays property markers
 * retrieved from Supabase. The markers are coloured according to the viewMode:
 * blue pins for active listings and gold pins for off‑market opportunities.
 */
export default function Map({ viewMode }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Initialise the map once after the component mounts
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-77.04, 38.907], // default to Washington DC
      zoom: 11,
    });
    mapRef.current = map;

    // Listen for custom events from the search bar to re‑center the map
    function handleGeocode(e: any) {
      const { lng, lat } = e.detail;
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 14 });
    }
    window.addEventListener('atlas-geocode', handleGeocode);
    return () => {
      window.removeEventListener('atlas-geocode', handleGeocode);
      map.remove();
    };
  }, []);

  // Fetch properties whenever the viewMode changes
  useEffect(() => {
    if (!mapRef.current) return;
    async function fetchData() {
      try {
        // Remove any existing markers
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        // Query Supabase for properties matching the selected status.  In a real
        // implementation you would filter by bounding box and other filters.
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', viewMode)
          .limit(200);
        if (error) {
          console.error('Error fetching properties', error);
          return;
        }
        if (!data) return;
        data.forEach((property: any) => {
          if (!property.longitude || !property.latitude) return;
          const el = document.createElement('div');
          el.className = 'marker';
          const colour = viewMode === 'on-market' ? '#007AFF' : '#C49A4A';
          el.style.backgroundColor = colour;
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([property.longitude, property.latitude])
            .addTo(mapRef.current!);
          // TODO: attach popup/slide‑over with property details
          markersRef.current.push(marker);
        });
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, [viewMode]);

  return <div ref={containerRef} className="h-full w-full" />;
}