import MembersSection from '../components/MembersSection';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import api from '../api/client';
import MapView from '../components/MapView';
import FilterBar from '../components/FilterBar';
import PlaceForm from '../components/PlaceForm';
import ReviewsSection from '../components/ReviewsSection';
import TransferControls from '../components/TransferControls';


const roleCanEdit = ['creator', 'editor'];

function PlaceDetails({
  place,
  canEdit,
  onEdit,
  onDelete,
  onStatus,
  currentUser,
  currentRole,
  userPosition,
  onReviewsChanged,
  startPlace,
  onSetStartPlace,
}) {
  const [photos, setPhotos] = useState(place?.photos || []);

  useEffect(() => {
    setPhotos(place?.photos || []);
  }, [place?.id, place?.photos]);

  async function removePhoto(photo) {
    if (!window.confirm('Supprimer cette photo ?')) return;
    try {
      await api.delete(`/places/${place.id}/photos/${photo.id}`);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (error) {
      window.alert(error.response?.data?.error?.message || 'Suppression impossible.');
    }
  }

  if (!place) {
    return (
      <div className="p-6 text-sm text-ink/50">
        Sélectionnez un lieu pour voir ses détails.
      </div>
    );
  }

  const rating = Number(
    place.avgRating ??
      place.avg_rating ??
      0
  );

  const reviewCount =
    place.reviewCount ??
    place.review_count ??
    0;

  const userStatus =
    place.userStatus ??
    place.user_status ??
      '';
  const placePosition = [Number(place.lat ?? place.latitude), Number(place.lon ?? place.lng ?? place.longitude)];
  const savedStartPosition = startPlace && startPlace.id !== place.id
    ? [Number(startPlace.lat ?? startPlace.latitude), Number(startPlace.lon ?? startPlace.lng ?? startPlace.longitude)]
    : null;
  const navigationStart = savedStartPosition || userPosition;

  return (
    <div className="p-5 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl">
            {place.name}
          </h2>

          <p className="text-sm text-ink/50 mt-1">
            {place.address}

            {place.city
              ? ` · ${place.city}`
              : ''}

            {place.country
              ? ` · ${place.country}`
              : ''}
          </p>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span className="font-medium">
            ★ {rating.toFixed(1)}
          </span>

          <span className="text-xs text-ink/40">
            {reviewCount}{' '}
            {reviewCount === 1
              ? 'avis'
              : 'avis'}
          </span>
        </div>
      </div>

      {/* Category */}
      {place.category && (
        <span className="inline-block mt-3 px-2 py-1 text-xs rounded-full bg-paper">
          {place.category.name}
        </span>
      )}

      {/* Description */}
      {place.description && (
        <p className="mt-4 text-sm leading-6">
          {place.description}
        </p>
      )}

      {place.openingHours && Object.keys(place.openingHours).length > 0 && (
        <div className="mt-4 p-3 rounded-card bg-paper text-sm">
          <p className="font-medium mb-2">Horaires</p>
          <dl className="space-y-1">
            {Object.entries(place.openingHours).map(([day, hours]) => (
              <div key={day} className="flex justify-between gap-4">
                <dt className="capitalize text-ink/60">{day}</dt>
                <dd>{String(hours)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Main information */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="p-3 rounded-card bg-paper">
          Avis
          <strong className="block mt-1">
            {reviewCount}
          </strong>
        </div>

        <div className="p-3 rounded-card bg-paper">
          Prix
          <strong className="block mt-1">
            {place.priceMin != null
              ? `${place.priceMin}–${
                  place.priceMax ?? ''
                }`
              : '—'}
          </strong>
        </div>
      </div>

      {/* Tags */}
      {place.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {place.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="text-xs px-2 py-1 border border-line rounded-full"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-5">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img src={photo.url} alt={place.name} className="w-full h-28 object-cover rounded-card" loading="lazy" />
              {canEdit && <button type="button" onClick={() => removePhoto(photo)} className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs">Supprimer</button>}
            </div>
          ))}
        </div>
      )}

      {/* GPS */}
      {(place.lat != null ||
        place.latitude != null) && (
        <div className="mt-4 text-xs text-ink/50">
          📍{' '}
          {Number(
            place.lat ?? place.latitude
          ).toFixed(5)}
          {', '}
          {Number(
            place.lon ??
              place.lng ??
              place.longitude
          ).toFixed(5)}
        </div>
      )}

      {(place.lat != null || place.latitude != null) && (
        <a
          className="inline-block mt-3 px-3 py-2 text-sm rounded-card border border-line hover:border-coral"
          target="_blank"
          rel="noreferrer"
          href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${navigationStart ? `${navigationStart[0]},${navigationStart[1]}` : ''};${placePosition[0]},${placePosition[1]}`}
        >
          Démarrer la navigation
        </a>
      )}

      {(place.lat != null || place.latitude != null) && (
        <button
          type="button"
          onClick={() => onSetStartPlace(place)}
          className={`inline-block mt-3 ml-2 px-3 py-2 text-sm rounded-card border ${startPlace?.id === place.id ? 'border-pine bg-pine-light/30 text-pine' : 'border-line hover:border-coral'}`}
        >
          {startPlace?.id === place.id ? 'Point de départ sélectionné' : 'Choisir comme départ'}
        </button>
      )}

      {/* Status */}
      <div className="mt-5">
  <div className="flex items-center justify-between mb-2">
    <p className="text-xs uppercase tracking-wide text-ink/40">
      Mon statut
    </p>

    {userStatus && (
      <span className="text-xs text-ink/50">
        Statut actuel
      </span>
    )}
  </div>

  <div className="flex flex-wrap gap-2">
    {[
      ['to_visit', '📌 À visiter'],
      ['visited', '✓ Visité'],
      ['favorite', '♥ Favori'],
    ].map(([value, label]) => {
      const active = userStatus === value;

      return (
        <button
          key={value}
          type="button"
          onClick={() => onStatus(value)}
          className={`px-3 py-2 text-sm rounded-card border transition ${
            active
              ? 'bg-ink text-white border-ink'
              : 'border-line hover:border-ink/40 hover:bg-paper'
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>
</div>

      {/* Edit/Delete */}
      {canEdit && (
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 rounded-card border border-line text-sm hover:bg-paper"
          >
            Modifier
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2 rounded-card border border-red-200 text-red-600 text-sm hover:bg-red-50"
          >
            Supprimer
          </button>
        </div>
      )}

      {/* Reviews */}
      <ReviewsSection
        placeId={place.id}
        currentUser={currentUser}
        currentRole={currentRole}
        onChanged={onReviewsChanged}
      />
    </div>
  );
}

export default function ListDetailPage() {
  const { listId } = useParams();
  const navigate = useNavigate();

  const [places, setPlaces] = useState([]);
  const [selected, setSelected] = useState(null);

  const [userPosition, setUserPosition] =
    useState(null);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [startPlace, setStartPlace] = useState(null);

  const [filters, setFilters] =
    useState({
      search: '',
      category: '',
      city: '',
      minRating: '',
      maxPrice: '',
      status: '',
    });

  const [showCreate, setShowCreate] =
    useState(false);

  const [editing, setEditing] =
    useState(null);

  const [error, setError] =
    useState('');

const [role, setRole] =
  useState('reader');

const [members, setMembers] =
  useState([]);

const [currentUser, setCurrentUser] =
  useState(null);
const [list, setList] = useState(null);
const [editingList, setEditingList] = useState(false);
const [listDraft, setListDraft] = useState({ name: '', description: '' });
const [listBusy, setListBusy] = useState(false);

  /*
   * Get current user.
   */
  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => {
        setCurrentUser(
          data.user ?? data
        );
      })
      .catch(() => {
        setCurrentUser(null);
      });
  }, []);

  /*
   * Get list + current user's role.
   */
useEffect(() => {
  loadList();
}, [listId]);

async function loadList() {
  try {
    const { data } = await api.get(`/lists/${listId}`);

    setRole(data.role);
    setMembers(data.list?.members || []);
    setList(data.list);
  } catch (err) {
    setError(
       err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Accès à la liste impossible.'
    );
  }
}

function beginListEdit() {
  setListDraft({ name: list?.name || '', description: list?.description || '' });
  setEditingList(true);
}

async function saveList(event) {
  event.preventDefault();
  if (!listDraft.name.trim()) return;
  try {
    setListBusy(true);
    setError('');
    const { data } = await api.put(`/lists/${listId}`, {
      name: listDraft.name.trim(),
      description: listDraft.description.trim() || null,
    });
    setList((current) => ({ ...current, ...data.list }));
    setEditingList(false);
  } catch (err) {
    setError(err.response?.data?.error?.message || 'Impossible de modifier la liste.');
  } finally {
    setListBusy(false);
  }
}

async function removeList() {
  if (!list || list.isPersonal || !window.confirm(`Supprimer la liste « ${list.name} » et tous ses lieux ?`)) return;
  try {
    setListBusy(true);
    await api.delete(`/lists/${listId}`);
    navigate('/lists', { replace: true });
  } catch (err) {
    setError(err.response?.data?.error?.message || 'Impossible de supprimer la liste.');
    setListBusy(false);
  }
}

  /*
   * Browser geolocation.
   */
  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition([
          pos.coords.latitude,
          pos.coords.longitude,
        ]);
      },
      () => {
        // User refused geolocation.
        // The map will use Paris as fallback.
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  /*
   * Load places.
   */
  const fetchPlaces = useCallback(
    async () => {
      try {
        setError('');

        const useNearby = nearbyOnly && userPosition;
        const { data } =
          await api.get(
            useNearby ? '/places/nearby' : `/lists/${listId}/search`,
            {
              params: {
                ...(useNearby ? {
                  listId,
                  lat: userPosition[0],
                  lon: userPosition[1],
                  radius: 25000,
                } : {}),
                category:
                  filters.category ||
                  undefined,

                city:
                  filters.city ||
                  undefined,

                minRating:
                  filters.minRating ||
                  undefined,

                maxPrice:
                  filters.maxPrice ||
                  undefined,

                status:
                  filters.status ||
                  undefined,

                [useNearby ? 'search' : 'q']: filters.search || undefined,
              },
            }
          );

        const nextPlaces =
          data.places || [];

        setPlaces(nextPlaces);

        setSelected((current) => {
          if (!current) {
            return null;
          }

          return (
            nextPlaces.find(
              (place) =>
                place.id === current.id
            ) || current
          );
        });
      } catch (err) {
        setError(
          err.response?.data?.error?.message ||
            err.response?.data?.message ||
            'Impossible de charger les lieux.'
        );
      }
    },
    [
      listId,
      filters,
      nearbyOnly,
      userPosition,
    ]
  );

  useEffect(() => {
    const timer = window.setTimeout(fetchPlaces, 300);
    return () => window.clearTimeout(timer);
  }, [fetchPlaces]);

  /*
   * Select a place and load the full details.
   */
  async function selectPlace(place) {
    try {
      const { data } = await api.get(
        `/places/${place.id}`
      );

      setSelected(data.place);
    } catch {
      setSelected(place);
    }
  }

  /*
   * Change personal status.
   */
  async function setStatus(status) {
    if (!selected) {
      return;
    }

    try {
      await api.put(
        `/places/${selected.id}/status`,
        { status }
      );

      setSelected((current) => ({
        ...current,
        userStatus: status,
        user_status: status,
      }));

      setPlaces((items) =>
        items.map((place) =>
          place.id === selected.id
            ? {
                ...place,
                userStatus: status,
                user_status: status,
              }
            : place
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Impossible de modifier le statut.'
      );
    }
  }

  /*
   * Delete place.
   */
  async function removePlace() {
    if (
      !selected ||
      !window.confirm(
        `Supprimer « ${selected.name} » ?`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/places/${selected.id}`
      );

      setSelected(null);
      setEditing(null);

      await fetchPlaces();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Suppression impossible.'
      );
    }
  }

  /*
   * Place created/edited successfully.
   */
  function afterSaved(place) {
    setShowCreate(false);
    setEditing(null);
    setSelected(place);
    fetchPlaces();
    api.get(`/places/${place.id}`).then(({ data }) => setSelected(data.place)).catch(() => {});
  }

  /*
   * Open create modal.
   */
  function openCreatePlace() {
    setEditing(null);
    setShowCreate(true);
  }

  /*
   * Close modal.
   */
  function closePlaceModal() {
    setShowCreate(false);
    setEditing(null);
  }

  const canEdit =
    roleCanEdit.includes(role);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 min-h-[calc(100vh-4rem)]">
      {/* Header */}
     <div className="flex items-center justify-between gap-4 mb-4">
  <div className="min-w-0 flex-1">
    {editingList ? (
      <form onSubmit={saveList} className="space-y-2 max-w-xl">
        <input
          className="w-full px-3 py-2 rounded-card border border-line font-display text-xl"
          value={listDraft.name}
          maxLength={150}
          required
          onChange={(event) => setListDraft((current) => ({ ...current, name: event.target.value }))}
        />
        <textarea
          className="w-full px-3 py-2 rounded-card border border-line text-sm"
          value={listDraft.description}
          rows={2}
          placeholder="Description de la liste"
          onChange={(event) => setListDraft((current) => ({ ...current, description: event.target.value }))}
        />
        <div className="flex gap-2">
          <button disabled={listBusy} className="px-3 py-2 rounded-card bg-ink text-white text-sm">Enregistrer</button>
          <button type="button" onClick={() => setEditingList(false)} className="px-3 py-2 rounded-card border border-line text-sm">Annuler</button>
        </div>
      </form>
    ) : (
      <>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl truncate">{list?.name || 'Lieux de la liste'}</h1>
          {list?.isPersonal && <span className="text-xs text-pine bg-pine-light/40 px-2 py-0.5 rounded-full">Perso</span>}
        </div>
        <p className="text-sm text-ink/50">{list?.description || 'Créez, modifiez et organisez les lieux de cette liste.'}</p>
        {role === 'creator' && (
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={beginListEdit} className="text-xs text-ink/60 hover:text-ink">Modifier la liste</button>
            {!list?.isPersonal && <button type="button" disabled={listBusy} onClick={removeList} className="text-xs text-red-600">Supprimer la liste</button>}
          </div>
        )}
      </>
    )}
  </div>

  <div className="flex gap-2">
    <TransferControls listId={listId} canImport={canEdit} onImported={fetchPlaces} />

    {canEdit && (
      <button
        type="button"
        className="supstar-add-place-button"
        onClick={openCreatePlace}
      >
        <span className="supstar-add-place-icon">
          +
        </span>

        Ajouter un lieu
      </button>
    )}
  </div>
</div>
      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
      />
      <div className="flex items-center gap-2 -mt-2 mb-4">
        <button
          type="button"
          disabled={!userPosition}
          onClick={() => setNearbyOnly((value) => !value)}
          className={`px-3 py-2 rounded-card border text-sm disabled:opacity-50 ${nearbyOnly ? 'bg-pine text-white border-pine' : 'border-line bg-white'}`}
        >
          {nearbyOnly ? 'Afficher toute la liste' : 'Lieux à moins de 25 km'}
        </button>
        {!userPosition && <span className="text-xs text-ink/50">Autorisez la géolocalisation pour rechercher autour de vous.</span>}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 grid lg:grid-cols-5 gap-4 min-h-0">
        {/* MAP */}
        <div className="lg:col-span-3 min-h-[360px] h-[420px] lg:h-auto rounded-card overflow-hidden border border-line">
          <MapView
            places={places}
            enableGeolocation
            userPosition={userPosition}
            onPlaceClick={selectPlace}
          />
        </div>

        {/* DETAILS / LIST */}
        <div className="lg:col-span-2 min-h-0 rounded-card border border-line bg-white overflow-hidden">
          {selected ? (
            <PlaceDetails
              place={selected}
              canEdit={canEdit}
              onEdit={() =>
                setEditing(selected)
              }
              onDelete={removePlace}
              onStatus={setStatus}
               currentUser={currentUser}
               currentRole={role}
               userPosition={userPosition}
               onReviewsChanged={() => selectPlace(selected)}
               startPlace={startPlace}
               onSetStartPlace={setStartPlace}
            />
          ) : (
            <div className="h-full overflow-y-auto p-4 space-y-2">
              {places.length === 0 && (
                <p className="text-sm text-ink/50 p-2">
                  Aucun lieu trouvé.
                </p>
              )}

              {places.map((place) => {
                const rating = Number(
                  place.avgRating ??
                    place.avg_rating ??
                    0
                );

                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() =>
                      selectPlace(place)
                    }
                    className="w-full text-left p-3 rounded-card border border-line hover:border-ink/30 transition"
                  >
                    <p className="font-medium text-sm">
                      {place.name}
                    </p>

                    <p className="text-xs text-ink/50">
                      {place.city ||
                        'Localisation inconnue'}

                      {' · '}

                      ★ {rating.toFixed(1)}

                      {place.distance_m !=
                        null &&
                        ` · ${(
                          place.distance_m /
                          1000
                        ).toFixed(1)} km`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <MembersSection
  listId={listId}
  members={members}
  currentUserId={currentUser?.id}
  currentRole={role}
  onMembersChanged={loadList}
/>

      {/* CREATE / EDIT PLACE MODAL */}
      {(showCreate || editing) && (
        <div className="fixed inset-0 z-[1000] bg-black/30 p-4 flex items-center justify-center">
          <div className="bg-white rounded-card shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-xl">
                {editing
                  ? 'Modifier le lieu'
                  : 'Nouveau lieu'}
              </h2>

              <button
                type="button"
                onClick={closePlaceModal}
                className="w-8 h-8 flex items-center justify-center rounded-full text-ink/50 hover:bg-paper hover:text-ink"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <PlaceForm
              listId={listId}
              place={editing}
              position={userPosition}
              onSaved={afterSaved}
              onCancel={closePlaceModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
