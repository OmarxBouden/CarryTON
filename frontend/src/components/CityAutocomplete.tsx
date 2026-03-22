'use client';
import { useState, useRef, useEffect } from 'react';

const CITIES = [
  'Lausanne', 'Geneva', 'Zurich', 'Bern', 'Basel', 'Lyon', 'Paris',
  'Montreux', 'Morges', 'Nyon', 'Fribourg', 'Neuchâtel', 'Sion',
  'Yverdon', 'Lucerne', 'Interlaken', 'Strasbourg', 'Milan', 'Turin', 'Annecy',
];

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}

export function CityAutocomplete({ value, onChange, placeholder, label }: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.length >= 1
    ? CITIES.filter((c) => c.toLowerCase().startsWith(query.toLowerCase()) && c !== query)
    : [];

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(true);
  }

  function handleSelect(city: string) {
    setQuery(city);
    onChange(city);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? 'Type a city…'}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2AABEE]"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          {filtered.map((city) => (
            <li key={city}>
              <button
                type="button"
                onMouseDown={() => handleSelect(city)}
                className="w-full text-left px-4 py-3 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100"
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
