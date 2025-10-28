import { useEffect } from 'react';

export default function AdminClient() {
  useEffect(() => {
    // Dynamically import the admin client logic to ensure it is bundled as a client chunk
    import('../../pages/admin/index.client').catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[AdminClient] Failed to load admin client module', err);
    });
  }, []);
  return null;
}
