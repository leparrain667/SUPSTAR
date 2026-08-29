import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { getApiError } from '../utils/errors';
import MapView from './MapView';

const emptyForm = {
  name: '',
  address: '',
  city: '',
  country: '',
  description: '',
  categoryId: '',
  openingHours: '',
  priceMin: '',
  priceMax: '',
  lat: '',
  lon: '',
  tags: '',
  photos: '',
};

function toForm(place, fallbackPosition) {
  if (!place) {
    return {
      ...emptyForm,
      lat: fallbackPosition?.[0] ?? '',
      lon: fallbackPosition?.[1] ?? '',
    };
  }

  return {
    name: place.name || '',
    address: place.address || '',
    city: place.city || '',
    country: place.country || '',
    description: place.description || '',
    categoryId: place.categoryId || '',
    openingHours: place.openingHours
      ? JSON.stringify(place.openingHours, null, 2)
      : '',
    priceMin: place.priceMin ?? '',
    priceMax: place.priceMax ?? '',
    lat: place.lat ?? '',
    lon: place.lon ?? '',
    tags: place.tags?.map((x) => x.tag.name).join(', ') || '',
    photos: place.photos?.map((x) => x.url).join('\n') || '',
  };
}

export default function PlaceForm({
  listId,
  place,
  position,
  onSaved,
  onCancel,
}) {
  const [form, setForm] = useState(() =>
    toForm(place, position)
  );

  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    api
      .get('/places/categories')
      .then(({ data }) => {
        setCategories(data.categories || []);
      })
      .catch(() =>
        setError(
          'Impossible de charger les catégories.'
        )
      );
  }, []);

  useEffect(() => {
    setForm(toForm(place, position));
    setSelectedFiles([]);
  }, [place, position]);

  function update(field) {
    return (e) =>
      setForm((current) => ({
        ...current,
        [field]: e.target.value,
      }));
  }

  const photoList = useMemo(() => {
    return form.photos
      .split(/\n|,/)
      .map((x) => x.trim())
      .filter(Boolean);
  }, [form.photos]);

  const pickerPlaces = useMemo(() => {
    const lat = Number(form.lat);
    const lon = Number(form.lon);
    return Number.isFinite(lat) && Number.isFinite(lon)
      ? [{ id: 'selected-position', name: form.name || 'Position choisie', lat, lon }]
      : [];
  }, [form.lat, form.lon, form.name]);

  async function submit(e) {
    e.preventDefault();

    setSaving(true);
    setError('');

    try {
      let openingHours = null;

      if (form.openingHours.trim()) {
        try {
          openingHours = JSON.parse(
            form.openingHours
          );
        } catch {
          throw new Error(
            'Les horaires doivent être un JSON valide.'
          );
        }
      }

      const payload = {
        ...(place ? {} : { listId }),

        name: form.name.trim(),

        address:
          form.address.trim() || null,

        city:
          form.city.trim() || null,

        country:
          form.country.trim() || null,

        description:
          form.description.trim() || null,

        categoryId: form.categoryId
          ? Number(form.categoryId)
          : null,

        openingHours,

        priceMin:
          form.priceMin === ''
            ? null
            : Number(form.priceMin),

        priceMax:
          form.priceMax === ''
            ? null
            : Number(form.priceMax),

        lat: Number(form.lat),
        lon: Number(form.lon),

        tags: form.tags
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),

        photos: photoList,
      };

      if (!payload.name) {
        throw new Error(
          'Le nom du lieu est obligatoire.'
        );
      }

      if (
        !Number.isFinite(payload.lat) ||
        !Number.isFinite(payload.lon)
      ) {
        throw new Error(
          'Latitude et longitude sont requises.'
        );
      }

      if (
        payload.priceMin !== null &&
        payload.priceMax !== null &&
        payload.priceMin > payload.priceMax
      ) {
        throw new Error(
          'Le prix minimum ne peut pas dépasser le prix maximum.'
        );
      }

      const response = place
        ? await api.put(
            `/places/${place.id}`,
            payload
          )
        : await api.post(
            '/places',
            payload
          );

      if (selectedFiles.length) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('photos', file));
        await api.post(`/places/${response.data.place.id}/photos`, formData);
      }

      onSaved(response.data.place);
    } catch (err) {
      setError(getApiError(err, 'Impossible d’enregistrer le lieu.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="place-form"
    >
      {/* HEADER */}

      <div className="place-form-header">
        <div>
          <h2>
            {place
              ? 'Modifier le lieu'
              : 'Ajouter un nouveau lieu'}
          </h2>

          <p>
            Remplissez les informations principales
            pour enregistrer ce lieu dans votre liste.
          </p>
        </div>
      </div>

      {/* INFORMATIONS */}

      <section className="place-section">
        <div className="place-section-title">
          <div>
            <span className="place-step">1</span>
          </div>

          <div>
            <h3>Informations générales</h3>
            <p>
              Les informations essentielles du lieu.
            </p>
          </div>
        </div>

        <div className="place-grid">
          <label className="place-field full">
            <span>Nom du lieu *</span>

            <input
              required
              value={form.name}
              onChange={update('name')}
              placeholder="Ex. Café de Flore"
            />
          </label>

          <label className="place-field">
            <span>Catégorie</span>

            <select
              value={form.categoryId}
              onChange={update('categoryId')}
            >
              <option value="">
                Choisir une catégorie
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="place-field">
            <span>Ville</span>

            <input
              value={form.city}
              onChange={update('city')}
              placeholder="Paris"
            />
          </label>

          <label className="place-field full">
            <span>Adresse</span>

            <input
              value={form.address}
              onChange={update('address')}
              placeholder="12 Rue Exemple"
            />
          </label>

          <label className="place-field">
            <span>Pays</span>

            <input
              value={form.country}
              onChange={update('country')}
              placeholder="France"
            />
          </label>
        </div>
      </section>

      {/* DESCRIPTION */}

      <section className="place-section">
        <div className="place-section-title">
          <div>
            <span className="place-step">2</span>
          </div>

          <div>
            <h3>Description & détails</h3>
            <p>
              Décrivez ce qui rend ce lieu intéressant.
            </p>
          </div>
        </div>

        <div className="place-grid">
          <label className="place-field full">
            <span>Description</span>

            <textarea
              rows="5"
              value={form.description}
              onChange={update('description')}
              placeholder="Présentez le lieu, son ambiance, ses spécialités..."
            />
          </label>

          <label className="place-field full">
            <span>
              Horaires
              <small>
                Format JSON optionnel
              </small>
            </span>

            <textarea
              rows="3"
              value={form.openingHours}
              onChange={update('openingHours')}
              placeholder={`{
  "lundi":"09:00-18:00",
  "mardi":"09:00-18:00"
}`}
            />
          </label>
        </div>
      </section>

      {/* PRICE + GPS */}

      <section className="place-section">
        <div className="place-section-title">
          <div>
            <span className="place-step">3</span>
          </div>

          <div>
            <h3>Prix & localisation</h3>
            <p>
              Indiquez une fourchette de prix et les coordonnées GPS.
            </p>
          </div>
        </div>

        <div className="place-grid">
          <label className="place-field">
            <span>Prix minimum (€)</span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.priceMin}
              onChange={update('priceMin')}
              placeholder="10"
            />
          </label>

          <label className="place-field">
            <span>Prix maximum (€)</span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.priceMax}
              onChange={update('priceMax')}
              placeholder="30"
            />
          </label>

          <label className="place-field">
            <span>Latitude *</span>

            <input
              required
              type="number"
              step="any"
              value={form.lat}
              onChange={update('lat')}
              placeholder="48.8566"
            />
          </label>

          <label className="place-field">
            <span>Longitude *</span>

            <input
              required
              type="number"
              step="any"
              value={form.lon}
              onChange={update('lon')}
              placeholder="2.3522"
            />
          </label>
        </div>

        <div className="gps-info">
          📍 Si vous avez autorisé la géolocalisation,
          les coordonnées sont automatiquement préremplies.
        </div>

        <div className="mt-4 h-64 rounded-card overflow-hidden border border-line">
          <MapView
            places={pickerPlaces}
            userPosition={position}
            enableGeolocation={false}
            onMapClick={({ lat, lng }) => setForm((current) => ({
              ...current,
              lat: lat.toFixed(6),
              lon: lng.toFixed(6),
            }))}
          />
        </div>
        <p className="mt-2 text-xs text-ink/50">Cliquez sur la carte pour choisir précisément les coordonnées.</p>
      </section>

      {/* TAGS */}

      <section className="place-section">
        <div className="place-section-title">
          <div>
            <span className="place-step">4</span>
          </div>

          <div>
            <h3>Tags & photos</h3>
            <p>
              Facilitez la recherche grâce aux mots-clés et aux images.
            </p>
          </div>
        </div>

        <div className="place-grid">
          <label className="place-field full">
            <span>Tags</span>

            <input
              value={form.tags}
              onChange={update('tags')}
              placeholder="romantique, terrasse, famille, brunch"
            />

            <small>
              Séparez les tags par des virgules.
            </small>
          </label>

          <label className="place-field full">
            <span>Photos</span>

            <textarea
              rows="4"
              value={form.photos}
              onChange={update('photos')}
              placeholder={`https://image1.jpg
https://image2.jpg`}
            />

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={(event) => setSelectedFiles(Array.from(event.target.files || []).slice(0, 10))}
            />

            {selectedFiles.length > 0 && (
              <small>{selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} prête{selectedFiles.length > 1 ? 's' : ''} à être importée{selectedFiles.length > 1 ? 's' : ''} (8 Mo maximum par image).</small>
            )}

            <small>
              Une URL par ligne ou séparée par des virgules.
            </small>
          </label>
        </div>

        {photoList.length > 0 && (
          <div className="photo-preview-grid">
            {photoList.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="photo-preview"
              >
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  onError={(e) => {
                    e.currentTarget.style.display =
                      'none';
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ERROR */}

      {error && (
        <div className="place-form-error">
          {error}
        </div>
      )}

      {/* ACTIONS */}

      <div className="place-form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="place-cancel"
          >
            Annuler
          </button>
        )}

        <button
          disabled={saving}
          className="place-submit"
        >
          {saving
            ? 'Enregistrement...'
            : place
            ? 'Enregistrer les modifications'
            : 'Créer le lieu'}
        </button>
      </div>
    </form>
  );
}
