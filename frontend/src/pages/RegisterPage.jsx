import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await register(form.email, form.password, form.displayName);
      navigate('/lists');
    } catch (err) {
      setError(err.response?.data?.error?.message || "Erreur lors de l'inscription");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 px-6">
      <h1 className="font-display text-2xl mb-6">Créer un compte</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-ink/70 mb-1">Nom affiché</label>
          <input
            required value={form.displayName} onChange={update('displayName')}
            className="w-full px-3 py-2 rounded-card border border-line focus:border-coral outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-ink/70 mb-1">Email</label>
          <input
            type="email" required value={form.email} onChange={update('email')}
            className="w-full px-3 py-2 rounded-card border border-line focus:border-coral outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-ink/70 mb-1">Mot de passe</label>
          <input
            type="password" required minLength={8} value={form.password} onChange={update('password')}
            className="w-full px-3 py-2 rounded-card border border-line focus:border-coral outline-none"
          />
        </div>
        {error && <p className="text-sm text-coral-dark">{error}</p>}
        <button type="submit" className="w-full py-2.5 rounded-card bg-coral text-white hover:bg-coral-dark transition-colors">
          Créer mon compte
        </button>
      </form>
      <p className="text-sm text-ink/60 mt-4">
        Déjà un compte ? <Link to="/login" className="text-coral hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}
