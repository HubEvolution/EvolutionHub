import React from 'react';

export default function BulkActions() {
  async function perform(action: 'approve' | 'reject' | 'flag' | 'hide') {
    try {
      const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input.comment-select:checked'));
      const ids = boxes.map((b) => b.getAttribute('data-comment-id')).filter(Boolean) as string[];
      if (ids.length === 0) {
        alert('Bitte mindestens einen Kommentar auswählen.');
        return;
      }
      const defaultReason = action === 'approve' ? '' : '';
      const reason = prompt('Grund (optional):', defaultReason) ?? '';
      if (!confirm(`Wirklich ${ids.length} Kommentar(e) ${action === 'approve' ? 'freigeben' : action === 'reject' ? 'ablehnen' : action === 'flag' ? 'markieren' : 'verstecken'}?`)) {
        return;
      }
      const res = await fetch('/api/admin/comments/bulk-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ commentIds: ids, action, reason }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        alert('Bulk-Aktion fehlgeschlagen');
        return;
      }
      location.reload();
    } catch (e) {
      console.error(e);
      alert('Fehler bei Bulk-Aktion');
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
        onClick={() => perform('approve')}
        type="button"
      >
        Ausgewählte freigeben
      </button>
      <button
        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
        onClick={() => perform('reject')}
        type="button"
      >
        Ausgewählte ablehnen
      </button>
      <button
        className="px-3 py-1 rounded bg-orange-600 text-white hover:bg-orange-700"
        onClick={() => perform('flag')}
        type="button"
      >
        Ausgewählte markieren
      </button>
      <button
        className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700"
        onClick={() => perform('hide')}
        type="button"
      >
        Ausgewählte verstecken
      </button>
    </div>
  );
}
