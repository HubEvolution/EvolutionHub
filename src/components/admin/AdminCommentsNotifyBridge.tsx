import { useEffect } from 'react';
import { useAdminStrings } from '@/lib/i18n-admin';
import { notify } from '@/lib/notify';

type AdminCommentsNotifyEventDetail = {
  type: 'success' | 'error';
  message?: string;
};

export default function AdminCommentsNotifyBridge() {
  const strings = useAdminStrings();

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AdminCommentsNotifyEventDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      const baseMessage =
        detail.type === 'success'
          ? strings.commentsAdmin.toasts.bulkSuccess
          : strings.commentsAdmin.toasts.bulkError;

      const message = detail.message || baseMessage;

      if (detail.type === 'success') {
        notify.success(message);
      } else {
        notify.error(message);
      }
    };

    window.addEventListener('eh:admin-comments-notify', handler as EventListener);
    return () => {
      window.removeEventListener('eh:admin-comments-notify', handler as EventListener);
    };
  }, [strings]);

  return null;
}
