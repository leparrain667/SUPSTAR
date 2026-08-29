import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api/config';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('oauth') === 'error';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/lists');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur de connexion');
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 px-6">
      <h1 className="font-display text-2xl mb-6">Connexion</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-ink/70 mb-1">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-card border border-line focus:border-coral outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-ink/70 mb-1">Mot de passe</label>
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-card border border-line focus:border-coral outline-none"
          />
        </div>
        {(error || oauthError) && <p className="text-sm text-coral-dark">{error || 'La connexion Google a échoué. Vérifiez la configuration OAuth puis réessayez.'}</p>}
        <button type="submit" className="w-full py-2.5 rounded-card bg-coral text-white hover:bg-coral-dark transition-colors">
          Se connecter
        </button>
      </form>
      <div className="flex items-center gap-3 my-5 text-xs text-ink/40"><span className="h-px bg-line flex-1" />ou<span className="h-px bg-line flex-1" /></div>
      <a href={`${API_BASE_URL}/auth/google`} className="block w-full py-2.5 rounded-card border border-line text-center hover:border-coral transition-colors">Continuer avec Google</a>
      <p className="text-sm text-ink/60 mt-4">
        Pas de compte ? <Link to="/register" className="text-coral hover:underline">Créer un compte</Link>
      </p>
    </div>
  );
}
