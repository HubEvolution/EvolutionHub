import { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminCreateDiscount,
  adminCreateStripeCouponForDiscount,
  fetchAdminDiscounts,
  type AdminDiscountCode,
  AdminApiError,
} from '@/lib/admin/api-client';

export type AdminDiscountFilters = {
  search?: string;
  status?: 'active' | 'inactive' | 'expired';
  isActiveNow?: boolean;
  hasRemainingUses?: boolean;
  limit?: number;
  cursor?: string | null;
};

interface DiscountState {
  items: AdminDiscountCode[];
  loading: boolean;
  error?: string;
  creating: boolean;
  createError?: string;
  couponUpdatingId?: string | null;
  couponError?: string;
  pagination?: {
    limit: number;
    cursor: string | null;
    hasMore: boolean;
  };
}

const initialState: DiscountState = {
  items: [],
  loading: false,
  creating: false,
};

function cleanFilters(filters: AdminDiscountFilters): AdminDiscountFilters {
  const cleaned: AdminDiscountFilters = {
    limit: filters.limit ?? 25,
    cursor: filters.cursor ?? null,
  };
  if (filters.search) cleaned.search = filters.search.trim();
  if (filters.status) cleaned.status = filters.status;
  if (typeof filters.isActiveNow === 'boolean') cleaned.isActiveNow = filters.isActiveNow;
  if (typeof filters.hasRemainingUses === 'boolean') {
    cleaned.hasRemainingUses = filters.hasRemainingUses;
  }
  return cleaned;
}

export function useAdminDiscounts(initialFilters: AdminDiscountFilters = {}) {
  const [state, setState] = useState<DiscountState>(initialState);
  const filtersRef = useRef<AdminDiscountFilters>(cleanFilters(initialFilters));
  const controllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  const load = useCallback(async (filters?: AdminDiscountFilters) => {
    const applied = cleanFilters(filters ?? filtersRef.current ?? {});
    filtersRef.current = applied;
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const data = await fetchAdminDiscounts(
        {
          search: applied.search ?? undefined,
          status: applied.status ?? undefined,
          isActiveNow: applied.isActiveNow,
          hasRemainingUses: applied.hasRemainingUses,
          limit: applied.limit,
          cursor: applied.cursor,
        },
        controller.signal
      );
      setState((prev) => ({
        ...prev,
        items: data.items ?? [],
        pagination: data.pagination,
        loading: false,
      }));
      return data;
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return undefined;
      if (error instanceof AdminApiError && error.status === 429 && error.retryAfterSec) {
        const ms = Math.max(0, Math.floor(error.retryAfterSec * 1000));
        const snapshotFilters = applied;
        const timeoutId = window.setTimeout(() => {
          const next = new AbortController();
          controllerRef.current = next;
          fetchAdminDiscounts(snapshotFilters, next.signal)
            .then((data) => {
              setState((prev) => ({
                ...prev,
                items: data.items ?? [],
                pagination: data.pagination,
                loading: false,
              }));
            })
            .catch((e) => {
              if ((e as DOMException)?.name === 'AbortError') return;
              const message =
                e instanceof Error ? e.message : 'Rabattliste konnte nicht geladen werden.';
              setState((prev) => ({ ...prev, loading: false, error: message }));
            });
        }, ms);
        retryTimeoutRef.current = timeoutId as unknown as number;
        return undefined;
      }
      const message =
        error instanceof Error ? error.message : 'Rabattliste konnte nicht geladen werden.';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return undefined;
    }
  }, []);

  const create = useCallback(
    async (payload: {
      code: string;
      stripeCouponId: string;
      type: 'percentage' | 'fixed';
      value: number;
      maxUses?: number | null;
      validFrom?: number | null;
      validUntil?: number | null;
      description?: string | null;
      status?: 'active' | 'inactive' | 'expired';
    }) => {
      setState((prev) => ({ ...prev, creating: true, createError: undefined }));
      try {
        const result = await adminCreateDiscount(payload);
        const discount = result.discountCode;
        setState((prev) => ({
          ...prev,
          creating: false,
          items: [discount, ...prev.items],
        }));
        return discount;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Rabattcode konnte nicht erstellt werden.';
        setState((prev) => ({ ...prev, creating: false, createError: message }));
        throw error;
      }
    },
    []
  );

  const createStripeCoupon = useCallback(async (discountId: string) => {
    setState((prev) => ({ ...prev, couponUpdatingId: discountId, couponError: undefined }));
    try {
      const result = await adminCreateStripeCouponForDiscount(discountId);
      const updated = result.discountCode;
      setState((prev) => ({
        ...prev,
        couponUpdatingId: null,
        items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
      }));
      return updated;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Stripe-Coupon konnte nicht erzeugt werden.';
      setState((prev) => ({ ...prev, couponUpdatingId: null, couponError: message }));
      throw error;
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
    return () => {
      controllerRef.current?.abort();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [load]);

  return {
    items: state.items,
    loading: state.loading,
    error: state.error,
    creating: state.creating,
    createError: state.createError,
    pagination: state.pagination,
    reload: load,
    create,
    couponUpdatingId: state.couponUpdatingId,
    couponError: state.couponError,
    createStripeCoupon,
  };
}
