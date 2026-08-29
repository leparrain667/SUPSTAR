import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserAvatar from './UserAvatar';
import NotificationsBell from './NotificationsBell';

function Icon({ name }) {
  const paths = {
    lists: <><path d="M5 6.5h15M5 12h15M5 17.5h15" /><circle cx="2" cy="6.5" r=".6" fill="currentColor" stroke="none" /><circle cx="2" cy="12" r=".6" fill="currentColor" stroke="none" /><circle cx="2" cy="17.5" r=".6" fill="currentColor" stroke="none" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.95 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.58 15 1.7 1.7 0 0 0 3 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.95a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.58 1.7 1.7 0 0 0 10 3h4v.08A1.7 1.7 0 0 0 15.05 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.42 9 1.7 1.7 0 0 0 21 10v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</g></svg>;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="brand" aria-label="SUPSTAR — Accueil">
          <span className="brand__mark" aria-hidden="true">S</span>
          <span className="brand__word">SUP<span>STAR</span></span>
        </Link>

        {user ? (
          <div className="app-header__actions">
            <NavLink to="/lists" className={({ isActive }) => `header-nav-link ${isActive ? 'is-active' : ''}`}>
              Mes listes
            </NavLink>
            <NotificationsBell />
            <div className="profile-menu" ref={menuRef}>
              <button type="button" className="profile-trigger" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-haspopup="menu">
                <UserAvatar user={user} size="small" />
                <span className="profile-trigger__name">{user.displayName}</span>
                <svg className="profile-trigger__chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
              </button>

              {menuOpen && (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-dropdown__identity">
                    <UserAvatar user={user} size="large" />
                    <div><strong>{user.displayName}</strong><span>{user.email}</span></div>
                  </div>
                  <div className="profile-dropdown__links">
                    <Link to="/lists" role="menuitem"><Icon name="lists" />Mes listes</Link>
                    <Link to="/settings" role="menuitem"><Icon name="settings" />Mon profil et paramètres</Link>
                  </div>
                  <button type="button" onClick={handleLogout} role="menuitem" className="profile-dropdown__logout">
                    <Icon name="logout" />Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="app-header__guest-actions">
            <Link to="/login">Connexion</Link>
            <Link to="/register" className="button button--primary button--compact">Créer un compte</Link>
          </div>
        )}
      </div>
    </header>
  );
}
