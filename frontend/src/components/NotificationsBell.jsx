import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

function timeAgo(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'À l’instant';
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
  return `Il y a ${Math.floor(seconds / 86400)} j`;
}

export default function NotificationsBell() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch { /* Notifications should never block the main navigation. */ }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  async function markRead(item) {
    if (!item.readAt) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnread((current) => Math.max(0, current - 1));
      await api.patch(`/notifications/${item.id}/read`).catch(() => {});
    }
    if (item.data?.listId && item.type !== 'removed_from_list') navigate(`/lists/${item.data.listId}`);
    setOpen(false);
  }

  async function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    setUnread(0);
    await api.patch('/notifications/read-all').catch(() => {});
  }

  return (
    <div className="notifications" ref={rootRef}>
      <button type="button" className={`notification-trigger ${open ? 'is-active' : ''}`} onClick={() => setOpen((value) => !value)} aria-label={unread ? `${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}` : 'Notifications'} aria-expanded={open}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {unread > 0 && <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notifications-dropdown">
          <div className="notifications-dropdown__header"><div><strong>Notifications</strong><span>{unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}</span></div>{unread > 0 && <button type="button" onClick={markAllRead}>Tout marquer comme lu</button>}</div>
          <div className="notifications-dropdown__list">
            {items.length === 0 ? <p className="notifications-empty">Aucune notification pour le moment.</p> : items.map((item) => (
              <button type="button" key={item.id} className={`notification-item ${item.readAt ? '' : 'is-unread'}`} onClick={() => markRead(item)}>
                <span className="notification-item__dot" aria-hidden="true" />
                <span><strong>{item.title}</strong><span>{item.message}</span><small>{timeAgo(item.createdAt)}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
