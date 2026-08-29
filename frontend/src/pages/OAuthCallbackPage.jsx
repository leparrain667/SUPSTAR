import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallbackPage() {
  const { acceptToken } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
    if (!token) return navigate('/login', { replace: true });
    acceptToken(token).then(() => navigate('/lists', { replace: true })).catch(() => navigate('/login', { replace: true }));
  }, [acceptToken, navigate]);
  return <div className="max-w-sm mx-auto mt-20 px-6 text-center">Connexion en cours…</div>;
}
