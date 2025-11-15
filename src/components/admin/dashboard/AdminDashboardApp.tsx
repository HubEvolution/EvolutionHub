import React, { useEffect, Suspense, lazy } from 'react';
import KpiOverviewSection from './sections/KpiOverviewSection';
import AuditMonitoringSection from './sections/AuditMonitoringSection';
import DiscountManagementSection from './sections/DiscountManagementSection';
import { useAdminTelemetry } from './hooks/useAdminTelemetry';

const UserInsightsSection = lazy(() => import('./sections/UserInsightsSection'));
const FinancialFeatureSection = lazy(() => import('./sections/FinancialFeatureSection'));

/**
 * Root React island for the admin dashboard.
 *
 * The island renders the high-level sections in a predefined order
 * and will later orchestrate data loading via dedicated hooks.
 */
const AdminDashboardApp: React.FC = () => {
  const { sendEvent } = useAdminTelemetry('dashboard');

  useEffect(() => {
    sendEvent('dashboard_loaded');
  }, [sendEvent]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        {/* Placeholder for future quick actions / alert badges */}
      </header>

      <KpiOverviewSection />
      <Suspense fallback={<div aria-busy="true" className="h-24 rounded-md bg-white/5" />}>
        <UserInsightsSection />
      </Suspense>
      <Suspense fallback={<div aria-busy="true" className="h-24 rounded-md bg-white/5" />}>
        <FinancialFeatureSection />
      </Suspense>
      <DiscountManagementSection />
      <AuditMonitoringSection />
    </div>
  );
};

export default AdminDashboardApp;
