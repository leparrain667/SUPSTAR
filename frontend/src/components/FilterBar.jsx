import { useEffect, useState } from 'react';
import api from '../api/client';

export default function FilterBar({ filters, onChange }) {
  const [categories, setCategories] = useState([]);
  useEffect(() => { api.get('/places/categories').then(({ data }) => setCategories(data.categories)).catch(() => {}); }, []);
  function update(field) { return (e) => onChange({ ...filters, [field]: e.target.value }); }
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <input placeholder="Rechercher..." value={filters.search} onChange={update('search')} className="flex-1 min-w-[160px] px-3 py-2 rounded-card border border-line focus:border-coral outline-none text-sm" />
      <select value={filters.category} onChange={update('category')} className="px-3 py-2 rounded-card border border-line text-sm"><option value="">Catégorie</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input placeholder="Ville" value={filters.city} onChange={update('city')} className="w-28 px-3 py-2 rounded-card border border-line text-sm" />
      <select value={filters.minRating} onChange={update('minRating')} className="px-3 py-2 rounded-card border border-line text-sm"><option value="">Note min.</option><option value="3">★ 3+</option><option value="4">★ 4+</option><option value="4.5">★ 4.5+</option></select>
      <input type="number" min="0" placeholder="Prix max" value={filters.maxPrice} onChange={update('maxPrice')} className="w-24 px-3 py-2 rounded-card border border-line text-sm" />
      <select value={filters.status} onChange={update('status')} className="px-3 py-2 rounded-card border border-line text-sm"><option value="">Statut</option><option value="to_visit">À visiter</option><option value="visited">Visité</option><option value="favorite">Favori</option></select>
    </div>
  );
}
