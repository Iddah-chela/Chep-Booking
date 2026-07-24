import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapPin, Navigation, X } from 'lucide-react';

// Fix default marker icons under Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export const DEFAULT_MAP_CENTER = [0.5149, 35.2916]; // Eldoret default center

function ClickToSetMarker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center?.[0] != null && center?.[1] != null) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

/**
 * Approximate-area pin picker (OSM).
 * value: { latitude, longitude } | null
 * onChange: ({ latitude, longitude }) => void
 */
export default function LocationPinPicker({
  value,
  onChange,
  height = 260,
  label = 'Drop an accurate map pin',
  hint = 'Public map shows an approximate area. Exact location is shared only after a viewing is confirmed.',
}) {
  const [locating, setLocating] = useState(false);
  const position = useMemo(() => {
    if (value?.latitude != null && value?.longitude != null) {
      return [Number(value.latitude), Number(value.longitude)];
    }
    return null;
  }, [value]);

  const center = position || DEFAULT_MAP_CENTER;

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onChange?.({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300'>
          <MapPin className='w-4 h-4 text-indigo-500' />
          {label}
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={handleUseMyLocation}
            disabled={locating}
            className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white'
          >
            <Navigation className='w-3.5 h-3.5' />
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          {position && (
            <button
              type='button'
              onClick={() => onChange?.(null)}
              className='inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            >
              <X className='w-3.5 h-3.5' /> Clear
            </button>
          )}
        </div>
      </div>
      <p className='text-xs text-gray-500 dark:text-gray-400'>{hint} Tap the map to set.</p>
      <div
        className='rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 z-0'
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          />
          <Recenter center={center} />
          <ClickToSetMarker
            onPick={({ latitude, longitude }) =>
              onChange?.({
                latitude: Number(latitude.toFixed(6)),
                longitude: Number(longitude.toFixed(6)),
              })
            }
          />
          {position && (
            <>
              <Marker position={position} />
              <Circle
                center={position}
                radius={350}
                pathOptions={{ color: '#4F46E5', fillColor: '#6366F1', fillOpacity: 0.15 }}
              />
            </>
          )}
        </MapContainer>
      </div>
      {position && (
        <p className='text-xs text-gray-500 dark:text-gray-400'>
          Pin: {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
      )}
    </div>
  );
}
