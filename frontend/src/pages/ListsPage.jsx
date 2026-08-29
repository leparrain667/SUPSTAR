import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getApiError } from '../utils/errors';

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}

export default function ListsPage() {
  const [lists, setLists] = useState([]);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function fetchLists() {
    try {
      setError('');
      const { data } = await api.get('/lists');
      setLists(data.lists);
    } catch (requestError) {
      setError(getApiError(requestError, 'Impossible de charger les listes.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLists(); }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      setError('');
      await api.post('/lists', { name: newName.trim(), description: newDescription.trim() || null });
      setNewName('');
      setNewDescription('');
      await fetchLists();
    } catch (requestError) {
      setError(getApiError(requestError, 'Impossible de créer la liste.'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="lists-page">
      <section className="lists-hero">
        <div>
          <span className="page-eyebrow">Votre carnet d’adresses</span>
          <h1>Des lieux qui méritent<br />d’être retenus.</h1>
          <p>Rassemblez vos découvertes, préparez une sortie et invitez vos proches à construire la sélection avec vous.</p>
        </div>
        <div className="lists-hero__count" aria-label={`${lists.length} listes`}>
          <strong>{String(lists.length).padStart(2, '0')}</strong>
          <span>liste{lists.length > 1 ? 's' : ''}<br />active{lists.length > 1 ? 's' : ''}</span>
        </div>
      </section>

      <section className="create-list-panel">
        <div className="create-list-panel__intro">
          <span className="create-list-panel__icon" aria-hidden="true">+</span>
          <div><h2>Nouvelle liste</h2><p>Un voyage, une ville ou simplement vos bonnes adresses.</p></div>
        </div>
        <form onSubmit={handleCreate} className="create-list-form">
          <label><span>Nom de la liste</span><input required maxLength={150} value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Week-end à Lisbonne" /></label>
          <label><span>Description <small>optionnelle</small></span><input maxLength={2000} value={newDescription} onChange={(event) => setNewDescription(event.target.value)} placeholder="Les adresses à tester ensemble" /></label>
          <button className="button button--primary" disabled={creating}>{creating ? 'Création…' : 'Créer la liste'}</button>
        </form>
      </section>

      {error && <div className="page-error" role="alert">{error}</div>}

      <section className="lists-collection">
        <div className="section-heading"><h2>Mes listes</h2><span>{lists.length} au total</span></div>
        {loading ? (
          <div className="lists-grid" aria-label="Chargement"><div className="list-card list-card--skeleton" /><div className="list-card list-card--skeleton" /></div>
        ) : lists.length === 0 ? (
          <div className="lists-empty"><strong>Votre carnet est encore vide.</strong><p>Créez votre première liste avec le formulaire ci-dessus.</p></div>
        ) : (
          <div className="lists-grid">
            {lists.map((list, index) => (
              <Link key={list.id} to={`/lists/${list.id}`} className="list-card">
                <div className="list-card__top">
                  <span className="list-card__number">{String(index + 1).padStart(2, '0')}</span>
                  {list.isPersonal && <span className="list-card__badge">Liste personnelle</span>}
                </div>
                <div className="list-card__content">
                  <h3>{list.name}</h3>
                  <p>{list.description || 'Une sélection prête à accueillir vos prochaines découvertes.'}</p>
                </div>
                <div className="list-card__footer">
                  <span>{list._count.places} lieu{list._count.places > 1 ? 'x' : ''}</span>
                  <span>{list._count.members} membre{list._count.members > 1 ? 's' : ''}</span>
                  <span className="list-card__arrow"><ArrowIcon /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
