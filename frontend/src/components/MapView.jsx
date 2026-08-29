import { useEffect, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import MarkerClusterModule from 'react-leaflet-cluster';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { normalizePlaceCoordinates } from '../utils/coordinates';

// react-leaflet-cluster 2.x is published as CommonJS with its component under
// `exports.default`. Vite 8 preserves that wrapper, so using the package's
// default import directly renders an object and crashes React. Support both
// interop shapes to keep the map compatible with current and older bundlers.
const MarkerClusterGroup = MarkerClusterModule.default ?? MarkerClusterModule;

// Fix the default Leaflet marker icons when using Vite.
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [48.8566, 2.3522];
const DEFAULT_ZOOM = 5;

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const resizeMap = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    resizeMap();

    const container = map.getContainer();

    let observer;

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(resizeMap);
      observer.observe(container);
    }

    window.addEventListener('resize', resizeMap);

    return () => {
      window.removeEventListener('resize', resizeMap);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

function FitPlaces({ places }) {
  const map = useMap();

  useEffect(() => {
    if (!places.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (places.length === 1) {
      map.setView(
        [places[0].lat, places[0].lon],
        14
      );
      return;
    }

    const bounds = L.latLngBounds(
      places.map((place) => [
        place.lat,
        place.lon,
      ])
    );

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 14,
    });
  }, [map, places]);

  return null;
}

function UserLocationHandler({ enabled }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    map.locate({
      enableHighAccuracy: true,
      setView: false,
      maxZoom: 14,
    });
  }, [map, enabled]);

  useMapEvents({
    locationfound(event) {
      map.setView(event.latlng, 14);
    },

    locationerror() {
      // Geolocation can be denied by the browser.
      // We simply keep the current map position.
    },
  });

  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick?.(event.latlng);
    },
  });

  return null;
}

function PlaceMarker({ place, onPlaceClick }) {
  const title =
    place.name ||
    place.title ||
    'Lieu';

  return (
    <Marker
      position={[place.lat, place.lon]}
      eventHandlers={{
        click: () => onPlaceClick?.(place),
      }}
    >
      <Popup>
        <div className="supstar-map-popup">
          <h3>{title}</h3>

          {(place.categoryName || place.category_name || place.category?.name) && (
            <p>{place.categoryName || place.category_name || place.category?.name}</p>
          )}

          {place.city && (
            <p>{place.city}</p>
          )}

          {(place.avgRating ?? place.avg_rating) !==
            undefined && (
            <p>
              ⭐{' '}
              {Number(
                place.avgRating ??
                  place.avg_rating ??
                  0
              ).toFixed(1)}
            </p>
          )}

          {onPlaceClick && (
            <button
              type="button"
              className="supstar-map-popup-button"
              onClick={() => onPlaceClick(place)}
            >
              Voir le lieu
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView({
  places = [],
  onPlaceClick,
  enableGeolocation = true,
  onMapClick,
  userPosition,
  className = '',
}) {
  const mapPlaces = useMemo(
    () =>
      places
        .map(normalizePlaceCoordinates)
        .filter(Boolean),
    [places]
  );

  const mapRef = useRef(null);

  return (
    <div
      className={`supstar-map ${className}`}
    >
      <MapContainer
        ref={mapRef}
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        zoomControl
        preferCanvas
        className="supstar-map-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapResizeHandler />

        <FitPlaces places={mapPlaces} />

        {enableGeolocation && (
          <UserLocationHandler enabled />
        )}

        <MapClickHandler
          onMapClick={onMapClick}
        />

        {Array.isArray(userPosition) && userPosition.length === 2 && (
          <CircleMarker
            center={userPosition}
            radius={8}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
          >
            <Popup>Votre position</Popup>
          </CircleMarker>
        )}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={45}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          removeOutsideVisibleBounds
        >
          {mapPlaces.map((place) => (
            <PlaceMarker
              key={place.id}
              place={place}
              onPlaceClick={onPlaceClick}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {mapPlaces.length === 0 && (
        <div className="supstar-map-empty">
          Aucun lieu avec des coordonnées GPS
          valides à afficher.
        </div>
      )}
    </div>
  );
}
