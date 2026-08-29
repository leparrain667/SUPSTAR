import { useEffect, useState } from 'react';
import api from '../api/client';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { getApiError } from '../utils/errors';

const EMPTY_PREFERENCES = {
  preferredCategories: '',
  budgetRange: '',
  notifications: true,
};

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [profile, setProfile] = useState({ displayName: '', avatarUrl: '' });
  const [preferences, setPreferences] = useState(EMPTY_PREFERENCES);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/users/me/settings')
      .then(({ data }) => {
        if (!active) return;
        const account = data.user;
        const value = account.travelPreference || {};
        setSettings(account);
        setProfile({ displayName: account.displayName || '', avatarUrl: account.avatarUrl || '' });
        setPreferences({
          preferredCategories: (value.preferredCategories || []).join(', '),
          budgetRange: value.budgetRange || '',
          notifications: value.notificationSettings?.enabled ?? true,
        });
      })
      .catch((error) => active && setFeedback({ type: 'error', text: getApiError(error, 'Impossible de charger vos paramètres.') }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const list = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
  const previewUser = { ...user, ...profile };

  async function saveProfile(event) {
    event.preventDefault();
    setFeedback(null);
    setSaving('profile');
    try {
      const { data } = await api.put('/users/me/profile', profile);
      setSettings((current) => ({ ...current, ...data.user }));
      await refreshUser();
      setFeedback({ type: 'success', text: 'Votre profil a été mis à jour.' });
    } catch (error) {
      setFeedback({ type: 'error', text: getApiError(error, 'Impossible d’enregistrer le profil.') });
    } finally {
      setSaving('');
    }
  }

  async function savePreferences(event) {
    event.preventDefault();
    setFeedback(null);
    setSaving('preferences');
    try {
      await api.put('/users/me/preferences', {
        preferredCategories: list(preferences.preferredCategories),
        budgetRange: preferences.budgetRange,
        notificationSettings: { enabled: preferences.notifications },
      });
      setFeedback({ type: 'success', text: 'Vos préférences ont été enregistrées.' });
    } catch (error) {
      setFeedback({ type: 'error', text: getApiError(error, 'Impossible d’enregistrer les préférences.') });
    } finally {
      setSaving('');
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setFeedback(null);
    setSaving('password');
    try {
      await api.put('/auth/password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      setFeedback({ type: 'success', text: 'Votre mot de passe a été modifié.' });
    } catch (error) {
      setFeedback({ type: 'error', text: getApiError(error, 'Impossible de modifier le mot de passe.') });
    } finally {
      setSaving('');
    }
  }

  if (loading) {
    return <main className="settings-page"><div className="settings-loading">Chargement de votre profil…</div></main>;
  }

  return (
    <main className="settings-page">
      <header className="page-heading">
        <span className="page-eyebrow">Votre compte</span>
        <h1>Profil et paramètres</h1>
        <p>Personnalisez votre identité et la façon dont SUPSTAR prépare vos découvertes.</p>
      </header>

      {feedback && (
        <div className={`settings-feedback settings-feedback--${feedback.type}`} role="status">
          <span aria-hidden="true">{feedback.type === 'success' ? '✓' : '!'}</span>{feedback.text}
        </div>
      )}

      <div className="settings-layout">
        <aside className="profile-summary">
          <UserAvatar user={previewUser} size="hero" />
          <h2>{profile.displayName || 'Votre nom'}</h2>
          <p>{settings?.email}</p>
          <div className="profile-summary__status"><span /> Compte actif</div>
          {settings?.oauthAccounts?.length > 0 && (
            <div className="profile-summary__providers">
              Connexion avec {settings.oauthAccounts.map((account) => account.provider).join(', ')}
            </div>
          )}
        </aside>

        <div className="settings-sections">
          <form onSubmit={saveProfile} className="settings-card">
            <div className="settings-card__heading">
              <div><span className="settings-card__index">01</span><h2>Identité</h2></div>
              <p>Ces informations sont visibles par les membres de vos listes.</p>
            </div>
            <div className="settings-card__body">
              <label className="form-field">
                <span>Nom affiché</span>
                <input value={profile.displayName} maxLength={100} onChange={(event) => setProfile((current) => ({ ...current, displayName: event.target.value }))} required />
              </label>
              <label className="form-field">
                <span>Adresse de l’avatar <small>optionnel</small></span>
                <div className="avatar-url-field">
                  <input type="url" value={profile.avatarUrl} placeholder="https://exemple.com/ma-photo.jpg" onChange={(event) => setProfile((current) => ({ ...current, avatarUrl: event.target.value }))} />
                  {profile.avatarUrl && <button type="button" onClick={() => setProfile((current) => ({ ...current, avatarUrl: '' }))}>Effacer</button>}
                </div>
                <small>Utilisez une image publique en HTTPS. L’aperçu et l’en-tête se mettent à jour automatiquement.</small>
              </label>
            </div>
            <div className="settings-card__footer">
              <button className="button button--primary" disabled={saving === 'profile'}>{saving === 'profile' ? 'Enregistrement…' : 'Enregistrer le profil'}</button>
            </div>
          </form>

          <form onSubmit={savePreferences} className="settings-card">
            <div className="settings-card__heading">
              <div><span className="settings-card__index">02</span><h2>Préférences de voyage</h2></div>
              <p>Aidez SUPSTAR à mieux organiser vos futures recommandations.</p>
            </div>
            <div className="settings-card__body settings-card__grid">
              <label className="form-field">
                <span>Catégories préférées</span>
                <input value={preferences.preferredCategories} onChange={(event) => setPreferences((current) => ({ ...current, preferredCategories: event.target.value }))} placeholder="Restaurants, musées, nature" />
                <small>Séparez les catégories par une virgule.</small>
              </label>
              <label className="form-field">
                <span>Budget habituel</span>
                <select value={preferences.budgetRange} onChange={(event) => setPreferences((current) => ({ ...current, budgetRange: event.target.value }))}>
                  <option value="">Sans préférence</option><option>€</option><option>€€</option><option>€€€</option>
                </select>
              </label>
              <label className="notification-setting">
                <span><strong>Notifications</strong><small>Recevoir les mises à jour de vos listes partagées.</small></span>
                <input type="checkbox" checked={preferences.notifications} onChange={(event) => setPreferences((current) => ({ ...current, notifications: event.target.checked }))} />
              </label>
            </div>
            <div className="settings-card__footer">
              <button className="button button--primary" disabled={saving === 'preferences'}>{saving === 'preferences' ? 'Enregistrement…' : 'Enregistrer les préférences'}</button>
            </div>
          </form>

          <form onSubmit={savePassword} className="settings-card">
            <div className="settings-card__heading">
              <div><span className="settings-card__index">03</span><h2>Sécurité</h2></div>
              <p>Choisissez un mot de passe unique d’au moins huit caractères.</p>
            </div>
            {settings?.hasPassword ? (
              <>
                <div className="settings-card__body settings-card__grid">
                  <label className="form-field"><span>Mot de passe actuel</span><input type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} required /></label>
                  <label className="form-field"><span>Nouveau mot de passe</span><input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} required /></label>
                </div>
                <div className="settings-card__footer"><button className="button button--secondary" disabled={saving === 'password'}>{saving === 'password' ? 'Modification…' : 'Modifier le mot de passe'}</button></div>
              </>
            ) : (
              <div className="settings-card__body"><p className="oauth-security-note">Votre compte utilise une connexion externe. Votre mot de passe est géré par votre fournisseur d’identité.</p></div>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
