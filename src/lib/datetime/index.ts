import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export function formatDate(date: Date, formatStr = 'PPP', locale = de) {
  return format(date, formatStr, { locale });
}
