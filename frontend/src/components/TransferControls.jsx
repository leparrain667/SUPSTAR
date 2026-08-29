import { useRef, useState } from 'react';
import api from '../api/client';

export default function TransferControls({ listId, canImport, onImported }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function download(format) {
    setBusy(true);
    setMessage('');
    try {
      const response = await api.get(`/lists/${listId}/export`, { params: { format }, responseType: 'blob' });
      const disposition = response.headers['content-disposition'] || '';
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `supstar.${format}`;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Export impossible');
    } finally { setBusy(false); }
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const format = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
      const content = await file.text();
      const { data } = await api.post(`/lists/${listId}/import`, { format, content });
      setMessage(`${data.imported} lieu(x) importé(s)`);
      await onImported?.();
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Import impossible');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" disabled={busy} className="px-3 py-2 rounded-card border border-line text-sm" onClick={() => download('json')}>Export JSON</button>
      <button type="button" disabled={busy} className="px-3 py-2 rounded-card border border-line text-sm" onClick={() => download('csv')}>Export CSV</button>
      {canImport && <>
        <input ref={inputRef} type="file" accept=".json,.csv,application/json,text/csv" className="hidden" onChange={importFile} />
        <button type="button" disabled={busy} className="px-3 py-2 rounded-card border border-line text-sm" onClick={() => inputRef.current?.click()}>Importer</button>
      </>}
      {message && <span className="basis-full text-right text-xs text-ink/60">{message}</span>}
    </div>
  );
}
