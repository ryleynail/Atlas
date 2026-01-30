"use client";

import { useState, useRef } from 'react';

/**
 * SearchBar provides an autocomplete search experience using Mapbox's Search
 * service. When the user selects a suggestion the component emits a custom
 * `atlas-geocode` event with the selected coordinates.  The Map component
 * listens for this event and re‑centres itself accordingly.
 */
export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const sessionTokenRef = useRef<string>(typeof crypto !== 'undefined' ? crypto.randomUUID() : '');

  async function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    if (!value || value.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const url =
        `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(value)}` +
        `&limit=5&session_token=${sessionTokenRef.current}&access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`;
      const res = await fetch(url);
      const json = await res.json();
      setSuggestions(json.suggestions ?? []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSelect(suggestion: any) {
    setQuery(suggestion.name);
    setSuggestions([]);
    try {
      const retrieveUrl =
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}` +
        `?session_token=${sessionTokenRef.current}&access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`;
      const res = await fetch(retrieveUrl);
      const json = await res.json();
      const feature = json.features?.[0];
      if (feature) {
        const [lng, lat] = feature.geometry.coordinates;
        // Dispatch event to global window so the Map can listen
        window.dispatchEvent(new CustomEvent('atlas-geocode', { detail: { lng, lat } }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={handleInput}
        placeholder="Search for an address, city, or ZIP code"
        className="w-full px-4 py-2 rounded border border-gold bg-background text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold"
      />
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 bg-background border border-gold rounded shadow-lg z-50 max-h-60 overflow-auto">
          {suggestions.map((item: any) => (
            <li
              key={item.mapbox_id}
              onClick={() => handleSelect(item)}
              className="px-4 py-2 cursor-pointer hover:bg-navy text-white"
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}