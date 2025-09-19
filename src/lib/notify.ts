import { toast } from 'sonner';

export type NotifyOptions = {
  description?: string;
  duration?: number;
};

export const notify = {
  success: (title: string, opts?: NotifyOptions) => toast.success(title, opts),
  error: (title: string, opts?: NotifyOptions) => toast.error(title, opts),
  info: (title: string, opts?: NotifyOptions) => toast.message(title, opts),
  promise: async <T>(
    p: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ): Promise<T> => {
    // Trigger Sonner toast lifecycle, but return the original promise's value
    toast.promise(p, msgs);
    return await p;
  },
};

export default notify;
