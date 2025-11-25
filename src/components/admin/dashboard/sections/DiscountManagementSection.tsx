import React, { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import { useAdminStrings } from '@/lib/i18n-admin';
import { useAdminTelemetry } from '@/components/admin/dashboard/hooks/useAdminTelemetry';
import {
  useAdminDiscounts,
  type AdminDiscountFilters,
} from '@/components/admin/dashboard/hooks/useAdminDiscounts';

const DiscountManagementSection: React.FC = () => {
  const strings = useAdminStrings();
  const { sendEvent } = useAdminTelemetry('discounts');
  const [filters, setFilters] = useState<AdminDiscountFilters>({});
  const [formState, setFormState] = useState({
    code: '',
    stripeCouponId: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 10,
    maxUses: '' as string,
    status: 'active' as 'active' | 'inactive' | 'expired',
  });
  const {
    items,
    loading,
    error,
    creating,
    createError,
    reload,
    create,
    couponUpdatingId,
    couponError,
    createStripeCoupon,
  } = useAdminDiscounts();

  const usageLabel = (maxUses: number | null, usesCount: number) => {
    if (maxUses == null) return `${usesCount} / ∞`;
    return `${usesCount} / ${maxUses}`;
  };

  const validityLabel = (validFrom: number | null, validUntil: number | null) => {
    if (!validFrom && !validUntil) return '—';
    const from = validFrom ? new Date(validFrom).toLocaleString() : '—';
    const until = validUntil ? new Date(validUntil).toLocaleString() : '—';
    return `${from} → ${until}`;
  };

  const appliedFilters = useMemo<AdminDiscountFilters>(() => {
    return {
      search: filters.search?.trim() || undefined,
      status: filters.status,
      isActiveNow: filters.isActiveNow,
      hasRemainingUses: filters.hasRemainingUses,
    };
  }, [filters]);

  const handleReload = async () => {
    await reload(appliedFilters);
    sendEvent('action_performed', {
      action: 'reload_discounts',
      metadata: appliedFilters,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const maxUses = formState.maxUses.trim()
        ? Number.parseInt(formState.maxUses.trim(), 10)
        : null;
      await create({
        code: formState.code.trim(),
        stripeCouponId: formState.stripeCouponId.trim(),
        type: formState.type,
        value: Number(formState.value) || 0,
        maxUses: Number.isFinite(maxUses) ? maxUses : null,
        status: formState.status,
      });
      setFormState((prev) => ({
        ...prev,
        code: '',
        stripeCouponId: '',
        maxUses: '',
      }));
      await reload(appliedFilters);
      sendEvent('action_performed', {
        action: 'create_discount',
        metadata: { code: formState.code.trim(), type: formState.type },
      });
    } catch (err) {
      sendEvent('api_error', {
        severity: 'warning',
        action: 'create_discount_failed',
        metadata: { message: err instanceof Error ? err.message : String(err) },
      });
    }
  };

  return (
    <section aria-labelledby="admin-discounts" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="admin-discounts" className="text-xl font-semibold text-gray-900 dark:text-white">
          {strings.discounts.heading}
        </h2>
        {(loading || creating) && (
          <span className="text-sm text-white/60">{strings.common.loading}</span>
        )}
      </div>

      <Card className="p-4" variant="default">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={handleSubmit}>
          <label className="text-sm text-white/70">
            {strings.discounts.create.codeLabel}
            <input
              type="text"
              value={formState.code}
              onChange={(event) => setFormState((prev) => ({ ...prev, code: event.target.value }))}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="text-sm text-white/70">
            {strings.discounts.create.stripeCouponIdLabel}
            <input
              type="text"
              value={formState.stripeCouponId}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, stripeCouponId: event.target.value }))
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="text-sm text-white/70">
            {strings.discounts.create.typeLabel}
            <select
              value={formState.type}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  type: event.target.value as 'percentage' | 'fixed',
                }))
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="percentage">%</option>
              <option value="fixed">Fix</option>
            </select>
          </label>
          <label className="text-sm text-white/70">
            {strings.discounts.create.valueLabel}
            <input
              type="number"
              min={1}
              value={formState.value}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, value: Number(event.target.value) || 0 }))
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="text-sm text-white/70">
            {strings.discounts.create.maxUsesLabel}
            <input
              type="number"
              min={1}
              value={formState.maxUses}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, maxUses: event.target.value }))
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="text-sm text-white/70">
            {strings.discounts.create.statusLabel}
            <select
              value={formState.status}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  status: event.target.value as 'active' | 'inactive' | 'expired',
                }))
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={creating}
            >
              {strings.discounts.create.submit}
            </button>
          </div>
        </form>
        {createError && <p className="mt-3 text-sm text-red-300">{createError}</p>}
      </Card>

      <Card className="p-4" variant="default">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[200px] text-sm text-white/70">
            {strings.discounts.filters.searchLabel}
            <input
              type="text"
              value={filters.search ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value || undefined }))
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="min-w-[140px] text-sm text-white/70">
            {strings.discounts.filters.statusLabel}
            <select
              value={filters.status ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  status:
                    (event.target.value as 'active' | 'inactive' | 'expired' | '') || undefined,
                }))
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{strings.common.all}</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={filters.isActiveNow ?? false}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, isActiveNow: event.target.checked || undefined }))
              }
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {strings.discounts.filters.isActiveNowLabel}
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={filters.hasRemainingUses ?? false}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  hasRemainingUses: event.target.checked || undefined,
                }))
              }
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {strings.discounts.filters.hasRemainingUsesLabel}
          </label>
          <button
            type="button"
            onClick={handleReload}
            className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
            disabled={loading}
          >
            {strings.discounts.filters.reload}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        {couponError && <p className="mt-2 text-sm text-red-300">{couponError}</p>}

        <div className="mt-4 max-h-[360px] overflow-auto rounded-md border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">{strings.discounts.table.code}</th>
                <th className="px-3 py-2 text-left">{strings.discounts.table.stripeCouponId}</th>
                <th className="px-3 py-2 text-left">{strings.discounts.table.type}</th>
                <th className="px-3 py-2 text-left">{strings.discounts.table.value}</th>
                <th className="px-3 py-2 text-left">{strings.discounts.table.status}</th>
                <th className="px-3 py-2 text-left">{strings.discounts.table.usage}</th>
                <th className="px-3 py-2 text-left">{strings.discounts.table.validity}</th>
                <th className="px-3 py-2 text-left">{strings.discounts.table.createdAt}</th>
                <th className="px-3 py-2 text-left">
                  {strings.discounts.actions.createStripeCoupon}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-white/5">
              {items.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-white/50" colSpan={8}>
                    {strings.discounts.empty}
                  </td>
                </tr>
              ) : (
                items.map((discount) => (
                  <tr key={discount.id}>
                    <td className="px-3 py-2 text-xs text-white/80">{discount.code}</td>
                    <td className="px-3 py-2 text-xs text-white/60">{discount.stripeCouponId}</td>
                    <td className="px-3 py-2 text-xs text-white/60">{discount.type}</td>
                    <td className="px-3 py-2 text-xs text-white/60">{discount.value}</td>
                    <td className="px-3 py-2 text-xs text-white/60">{discount.status}</td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {usageLabel(discount.maxUses, discount.usesCount)}
                    </td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {validityLabel(discount.validFrom, discount.validUntil)}
                    </td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {discount.createdAt ? new Date(discount.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {discount.stripeCouponId ? (
                        <div className="flex items-center gap-2">
                          <span className="break-all text-[10px] text-white/70">
                            {discount.stripeCouponId}
                          </span>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md border border-white/25 px-2 py-1 text-[10px] text-white/80 hover:bg-white/10"
                            onClick={async () => {
                              try {
                                if (navigator?.clipboard?.writeText) {
                                  await navigator.clipboard.writeText(discount.stripeCouponId);
                                }
                              } catch {
                                // Copy-Fehler still ignorieren
                              }
                            }}
                          >
                            {strings.discounts.actions.copyStripeCouponId}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-emerald-500 px-2 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-600/20 disabled:opacity-50"
                          disabled={couponUpdatingId === discount.id || loading}
                          onClick={async () => {
                            const confirmed = window.confirm(
                              strings.discounts.actions.confirmCreateStripeCoupon
                            );
                            if (!confirmed) return;
                            try {
                              await createStripeCoupon(discount.id);
                              sendEvent('action_performed', {
                                action: 'create_stripe_coupon',
                                metadata: { code: discount.code },
                              });
                            } catch {
                              // Fehler werden über couponError angezeigt
                            }
                          }}
                        >
                          {couponUpdatingId === discount.id
                            ? strings.common.loading
                            : strings.discounts.actions.createStripeCoupon}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
};

export default DiscountManagementSection;
