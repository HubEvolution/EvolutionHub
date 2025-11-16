import { getLocale, type Locale } from '@/lib/i18n';
import deRaw from '@/locales/admin.de.json' with { type: 'json' };
import enRaw from '@/locales/admin.en.json' with { type: 'json' };

export interface AdminLocale {
  common: {
    loading: string;
    updating: string;
    refresh: string;
    search: string;
    reset: string;
    all: string;
    loadMore: string;
    refreshBalance: string;
    refreshHistory: string;
  };
  kpi: {
    heading: string;
    loading: string;
    trafficTitle: string;
    trafficSum: string;
    stripeTitle: string;
    stripeNote: string;
    cacheHit: string; // expects {seconds}
    live: string;
    alerts: string;
    active: string;
  };
  insights: {
    heading: string;
    searchLabel: string;
    searchPlaceholder: string;
    status: string;
    plan: string;
    statusOptions: { active: string; banned: string; deleted: string };
    listHeading: string;
    listReload: string;
    details: string;
    actions: { ban: string; unban: string; delete: string };
    table: {
      user: string;
      plan: string;
      status: string;
      credits: string;
      sessions: string;
      lastActivity: string;
      actions: string;
    };
    list: { none: string };
    summary: {
      user: string;
      subscription: string;
      subscriptionNone: string;
      subscriptionEnd: string;
      lastActivity: string;
      ip: string;
    };
    sessions: {
      heading: string;
      revokeAll: string;
      none: string;
      table: { id: string; expires: string };
    };
    credits: { heading: string; tenthsLabel: string };
    history: {
      none: string;
      table: { pack: string; units: string; created: string; expires: string };
    };
  };
  discounts: {
    heading: string;
    create: {
      heading: string;
      codeLabel: string;
      stripeCouponIdLabel: string;
      typeLabel: string;
      valueLabel: string;
      maxUsesLabel: string;
      statusLabel: string;
      submit: string;
    };
    filters: {
      searchLabel: string;
      statusLabel: string;
      isActiveNowLabel: string;
      hasRemainingUsesLabel: string;
      reload: string;
    };
    table: {
      code: string;
      stripeCouponId: string;
      type: string;
      value: string;
      status: string;
      usage: string;
      validity: string;
      createdAt: string;
    };
    empty: string;
  };
  errors: {
    userListLoad: string;
    userListLoadMore: string;
    userBan: string;
    userUnban: string;
    userDelete: string;
    userLookup: string;
    sessionsLoad: string;
    sessionsRevoke: string;
  };
}

const de = deRaw as AdminLocale;
const en = enRaw as AdminLocale;

export function getAdminStrings(pathname?: string): AdminLocale {
  let locale: Locale = 'de';
  try {
    if (typeof window !== 'undefined' && !pathname) {
      locale = getLocale(window.location.pathname);
    } else if (pathname) {
      locale = getLocale(pathname);
    }
  } catch {}
  return locale === 'en' ? en : de;
}

export function useAdminStrings(): AdminLocale {
  // Synchronous resolution based on current location
  return getAdminStrings(typeof window !== 'undefined' ? window.location.pathname : '/');
}
