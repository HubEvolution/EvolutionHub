import { ensureCsrfToken } from '@/lib/security/csrf';
import { useAdminStrings } from '@/lib/i18n-admin';
import { notify } from '@/lib/notify';

export default function BulkActions() {
  const strings = useAdminStrings();
  async function perform(action: 'approve' | 'reject' | 'flag' | 'hide') {
    try {
      const boxes = Array.from(
        document.querySelectorAll<HTMLInputElement>('input.comment-select:checked')
      );
      const ids = boxes.map((b) => b.getAttribute('data-comment-id')).filter(Boolean) as string[];
      if (ids.length === 0) {
        notify.info(strings.commentsAdmin.toasts.noSelection);
        return;
      }
      const defaultReason = action === 'approve' ? '' : '';
      const reason = prompt('Grund (optional):', defaultReason) ?? '';
      if (
        !confirm(
          `Wirklich ${ids.length} Kommentar(e) ${action === 'approve' ? 'freigeben' : action === 'reject' ? 'ablehnen' : action === 'flag' ? 'markieren' : 'verstecken'}?`
        )
      ) {
        return;
      }
      const csrf = ensureCsrfToken();
      const res = await fetch('/api/admin/comments/bulk-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        credentials: 'same-origin',
        body: JSON.stringify({ commentIds: ids, action, reason }),
      });
      const json: { success?: boolean; error?: { message?: string } } = await res.json();
      if (!res.ok || !json?.success) {
        notify.error(strings.commentsAdmin.toasts.bulkError);
        return;
      }
      notify.success(strings.commentsAdmin.toasts.bulkSuccess);
      location.reload();
    } catch (e) {
      console.error(e);
      notify.error(strings.commentsAdmin.toasts.bulkError);
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
