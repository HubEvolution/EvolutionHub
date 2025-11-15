import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';

interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxUses: number | null;
  usesCount: number;
  validFrom: number | null;
  validUntil: number | null;
  status: 'active' | 'inactive' | 'expired';
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

const DiscountManagementSection: React.FC = () => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    maxUses: '',
    validFrom: '',
    validUntil: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  const fetchDiscountCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/discounts/list');
      if (!response.ok) {
        throw new Error('Failed to fetch discount codes');
      }
      const data: { data?: { discountCodes?: DiscountCode[] } } = await response.json();
      setDiscountCodes(data.data?.discountCodes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const payload = {
        code: formData.code,
        type: formData.type,
        value: Number(formData.value),
        maxUses: formData.maxUses ? Number(formData.maxUses) : null,
        validFrom: formData.validFrom ? new Date(formData.validFrom).getTime() : null,
        validUntil: formData.validUntil ? new Date(formData.validUntil).getTime() : null,
        description: formData.description || undefined,
        status: formData.status,
      };

      const response = await fetch('/api/admin/discounts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData: { error?: { message?: string } } = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create discount code');
      }

      // Reset form and refresh list
      setFormData({
        code: '',
        type: 'percentage',
        value: 0,
        maxUses: '',
        validFrom: '',
        validUntil: '',
        description: '',
        status: 'active',
      });
      setShowCreateForm(false);
      await fetchDiscountCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteCode = async (code: string) => {
    if (!confirm(`Are you sure you want to delete discount code "${code}"?`)) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/admin/discounts/${code}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData: { error?: { message?: string } } = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete discount code');
      }

      await fetchDiscountCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <section aria-labelledby="admin-discounts" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="admin-discounts"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            Discount Code Management
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-white/70">
            Create, manage, and track discount codes
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'Create Code'}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {showCreateForm && (
        <Card className="p-6" variant="default">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Create Discount Code
          </h3>
          <form onSubmit={handleCreateCode} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80">
                  Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="SUMMER2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80">
                  Value
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80">
                  Max Uses (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80">
                  Valid From (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/80">
                  Valid Until (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/80">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6" variant="default">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Active Discount Codes
        </h3>
        {loading ? (
          <p className="text-sm text-gray-600 dark:text-white/70">Loading...</p>
        ) : discountCodes.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-white/70">No discount codes found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/60">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/60">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/60">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/60">
                    Uses
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/60">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-white/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-white/5 dark:bg-transparent">
                {discountCodes.map((discount) => (
                  <tr key={discount.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {discount.code}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-white/70">
                      {discount.type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-white/70">
                      {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-white/70">
                      {discount.usesCount}
                      {discount.maxUses ? ` / ${discount.maxUses}` : ' / ∞'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          discount.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                            : discount.status === 'inactive'
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        }`}
                      >
                        {discount.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <button
                        type="button"
                        onClick={() => handleDeleteCode(discount.code)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
};

export default DiscountManagementSection;
