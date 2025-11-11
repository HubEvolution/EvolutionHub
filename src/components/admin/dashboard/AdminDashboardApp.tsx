import React, { useEffect } from 'react';
import KpiOverviewSection from './sections/KpiOverviewSection';
import UserInsightsSection from './sections/UserInsightsSection';
import FinancialFeatureSection from './sections/FinancialFeatureSection';
import AuditMonitoringSection from './sections/AuditMonitoringSection';
import { useAdminTelemetry } from './hooks/useAdminTelemetry';

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
      <UserInsightsSection />
      <FinancialFeatureSection />
      <AuditMonitoringSection />
    </div>
  );
};

export default AdminDashboardApp;
