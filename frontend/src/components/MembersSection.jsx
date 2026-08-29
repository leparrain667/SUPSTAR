import { useState } from 'react';
import api from '../api/client';
import UserAvatar from './UserAvatar';

const ROLES = {
  creator: 'Créateur',
  editor: 'Éditeur',
  commentator: 'Commentateur',
  reader: 'Lecteur',
};

const ROLE_DESCRIPTIONS = {
  creator: 'Gestion complète de la liste',
  editor: 'Peut gérer les lieux',
  commentator: 'Peut ajouter des avis et commentaires',
  reader: 'Lecture uniquement',
};

function getErrorMessage(err, fallback) {
  const data = err?.response?.data;

  if (typeof data?.error === 'string') {
    return data.error;
  }

  if (typeof data?.message === 'string') {
    return data.message;
  }

  if (typeof data === 'string') {
    return data;
  }

  return fallback;
}
export default function MembersSection({
  listId,
  members = [],
  currentUserId,
  currentRole,
  onMembersChanged,
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('reader');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isCreator = currentRole === 'creator';


async function inviteMember(e) {
  e.preventDefault();

  const cleanEmail = email.trim();

  if (!cleanEmail) {
    setError('Veuillez saisir une adresse email.');
    setSuccess('');
    return;
  }

  setError('');
  setSuccess('');
  setLoading(true);

  try {
    const { data } = await api.post(
      `/lists/${listId}/members`,
      {
        email: cleanEmail,
        role,
      }
    );

    setEmail('');
    setRole('reader');

    setSuccess(
      data?.message ||
      'Membre ajouté avec succès.'
    );

    if (onMembersChanged) {
      await onMembersChanged();
    }
  } catch (err) {
    console.error(
      'Erreur invitation membre:',
      err
    );

    const responseData = err?.response?.data;

    let message =
      "Impossible d'ajouter ce membre.";

    if (typeof responseData?.error === 'string') {
      message = responseData.error;
    } else if (
      typeof responseData?.message === 'string'
    ) {
      message = responseData.message;
    } else if (
      typeof responseData === 'string'
    ) {
      message = responseData;
    }

    setError(message);
    setSuccess('');
  } finally {
    setLoading(false);
  }
}

 async function changeRole(member, newRole) {
  // Le créateur ne peut pas changer de rôle
  if (member.role === 'creator') {
    return;
  }

  // Vérifier que le rôle demandé est autorisé
  const validRoles = ['editor', 'commentator', 'reader'];

  if (!validRoles.includes(newRole)) {
    setError('Rôle invalide.');
    return;
  }

  // Éviter de refaire la même requête
  if (member.role === newRole) {
    return;
  }

  setError('');
  setSuccess('');
  setActionLoading(member.userId);

  try {
    const { data } = await api.put(
      `/lists/${listId}/members/${member.userId}`,
      {
        role: newRole,
      }
    );

    setSuccess(
      data?.message || 'Rôle modifié avec succès.'
    );

    if (onMembersChanged) {
      await onMembersChanged();
    }
  } catch (err) {
    console.error(
      'Erreur modification rôle:',
      err
    );

    const responseData = err?.response?.data;

    let message = 'Impossible de modifier le rôle.';

    if (typeof responseData?.error === 'string') {
      message = responseData.error;
    } else if (typeof responseData?.message === 'string') {
      message = responseData.message;
    } else if (typeof responseData === 'string') {
      message = responseData;
    }

    setError(message);
    setSuccess('');
  } finally {
    setActionLoading(null);
  }
}
  async function removeMember(member) {
  // Protection supplémentaire côté frontend
  if (member.role === 'creator') {
    setError('Le créateur ne peut pas être retiré de la liste.');
    setSuccess('');
    return;
  }

  const name =
    member.user?.displayName ||
    member.user?.email ||
    'cet utilisateur';

  const confirmed = window.confirm(
    `Retirer ${name} de cette liste ?`
  );

  if (!confirmed) {
    return;
  }

  setError('');
  setSuccess('');
  setActionLoading(member.userId);

  try {
    const { data } = await api.delete(
      `/lists/${listId}/members/${member.userId}`
    );

    setSuccess(
      data?.message ||
      'Membre retiré de la liste.'
    );

    if (onMembersChanged) {
      await onMembersChanged();
    }
  } catch (err) {
    console.error(
      'Erreur suppression membre:',
      err
    );

    const responseData = err?.response?.data;

    let message =
      'Impossible de retirer ce membre.';

    if (typeof responseData?.error === 'string') {
      message = responseData.error;
    } else if (
      typeof responseData?.message === 'string'
    ) {
      message = responseData.message;
    } else if (
      typeof responseData === 'string'
    ) {
      message = responseData;
    }

    setError(message);
    setSuccess('');
  } finally {
    setActionLoading(null);
  }
}

  return (
    <section className="mt-6 rounded-card border border-line bg-white overflow-hidden">
      <div className="p-5 border-b border-line">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl">
              Membres de la liste
            </h2>

            <p className="text-sm text-ink/50 mt-1">
              Gérez les personnes qui participent à cette liste.
            </p>
          </div>

          <span className="text-sm px-3 py-1 rounded-full bg-paper">
            {members.length} membre{members.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-card bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-3 rounded-card bg-green-50 text-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-3">
          {members.map((member) => {
            const user = member.user || {};

            const name =
              user.displayName ||
              user.email ||
              'Utilisateur';

            const isCurrentUser =
              member.userId === currentUserId;

            const isMemberCreator =
              member.role === 'creator';

            const busy =
              actionLoading === member.userId;

            return (
              <div
                key={member.userId}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-card border border-line"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar user={user} size="medium" />

                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {name}

                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-ink/40">
                          Vous
                        </span>
                      )}
                    </p>

                    {user.email && (
                      <p className="text-xs text-ink/50 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-paper">
                    {ROLES[member.role] || member.role}
                  </span>

                  {isMemberCreator && (
                    <span className="text-xs text-ink/40">
                      {ROLE_DESCRIPTIONS.creator}
                    </span>
                  )}

                  {isCreator && !isMemberCreator && (
                    <>
                      <select
                        value={member.role}
                        disabled={busy}
                        onChange={(e) =>
                          changeRole(
                            member,
                            e.target.value
                          )
                        }
                        className="px-3 py-2 rounded-card border border-line text-sm bg-white"
                      >
                        <option value="editor">
                          Éditeur
                        </option>

                        <option value="commentator">
                          Commentateur
                        </option>

                        <option value="reader">
                          Lecteur
                        </option>
                      </select>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          removeMember(member)
                        }
                        className="px-3 py-2 rounded-card border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50"
                      >
                        {busy
                          ? '...'
                          : 'Retirer'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {members.length === 0 && (
            <p className="text-sm text-ink/50">
              Aucun membre dans cette liste.
            </p>
          )}
        </div>

        {isCreator && (
          <div className="mt-6 pt-5 border-t border-line">
            <h3 className="font-medium text-sm mb-3">
              Inviter un membre
            </h3>

            <form
              onSubmit={inviteMember}
              className="grid md:grid-cols-[1fr_180px_auto] gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="email@exemple.com"
                className="px-3 py-2 rounded-card border border-line text-sm outline-none focus:border-ink"
              />

              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value)
                }
                className="px-3 py-2 rounded-card border border-line text-sm bg-white"
              >
                <option value="editor">
                  Éditeur
                </option>

                <option value="commentator">
                  Commentateur
                </option>

                <option value="reader">
                  Lecteur
                </option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-card bg-ink text-white text-sm disabled:opacity-50"
              >
                {loading
                  ? 'Ajout...'
                  : '+ Inviter'}
              </button>
            </form>

            <p className="text-xs text-ink/40 mt-2">
              L'utilisateur doit déjà posséder un compte SUPSTAR.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
