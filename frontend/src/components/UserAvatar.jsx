import { useEffect, useState } from 'react';

function getInitials(name) {
  const words = String(name || 'Utilisateur').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'U';
}

export default function UserAvatar({ user, size = 'medium', className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = user?.avatarUrl?.trim();
  const label = user?.displayName || user?.email || 'Utilisateur';

  useEffect(() => setImageFailed(false), [avatarUrl]);

  return (
    <span
      className={`user-avatar user-avatar--${size} ${className}`.trim()}
      aria-label={`Avatar de ${label}`}
    >
      {avatarUrl && !imageFailed ? (
        <img src={avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
      ) : (
        <span aria-hidden="true">{getInitials(label)}</span>
      )}
    </span>
  );
}
