import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
    initGooglePlaces: () => void;
  }
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: {
    house_number: string;
    street: string;
    village_city: string;
    district: string;
    state: string;
    pin_code: string;
  }) => void;
  apiKey?: string;
}

export default function AddressAutocomplete({ onAddressSelect, apiKey }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    // Load Google Places API script
    const loadGooglePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setScriptLoaded(true);
        initializeAutocomplete();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey || process.env.VITE_GOOGLE_MAPS_API_KEY || ''}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setScriptLoaded(true);
        initializeAutocomplete();
      };
      script.onerror = () => {
        console.warn('Google Places API failed to load. Address autocomplete will not be available.');
      };
      document.head.appendChild(script);
    };

    const initializeAutocomplete = () => {
      if (!inputRef.current || !window.google?.maps?.places) return;

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['address_components', 'formatted_address', 'geometry'],
        types: ['address']
      });

      autocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.address_components) return;

        // Parse address components
        let house_number = '';
        let street = '';
        let village_city = '';
        let district = '';
        let state = '';
        let pin_code = '';

        for (const component of place.address_components) {
          const types = component.types;

          if (types.includes('street_number')) {
            house_number = component.long_name;
          } else if (types.includes('route')) {
            street = component.long_name;
          } else if (types.includes('locality') || types.includes('sublocality')) {
            village_city = component.long_name;
          } else if (types.includes('administrative_area_level_2')) {
            district = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (types.includes('postal_code')) {
            pin_code = component.postal_code || component.long_name;
          }
        }

        // If district not found, try sublocality_level_1
        if (!district) {
          for (const component of place.address_components) {
            if (component.types.includes('sublocality_level_1')) {
              district = component.long_name;
              break;
            }
          }
        }

        onAddressSelect({
          house_number: house_number || '',
          street: street || '',
          village_city: village_city || '',
          district: district || '',
          state: state || '',
          pin_code: pin_code || ''
        });

        setSearchValue(place.formatted_address || '');
      });
    };

    loadGooglePlaces();

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
      }
    };
  }, [apiKey, onAddressSelect]);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Search Address (Google Places Autocomplete)
      </label>
      <input
        ref={inputRef}
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder="Start typing your address..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={!scriptLoaded}
      />
      {!scriptLoaded && (
        <p className="mt-1 text-xs text-gray-500">
          Loading address autocomplete...
        </p>
      )}
      {scriptLoaded && (
        <p className="mt-1 text-xs text-green-600">
          ✓ Address autocomplete ready - Start typing to search
        </p>
      )}
    </div>
  );
}

