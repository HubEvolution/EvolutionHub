import React from 'react';
import Card from '@/components/ui/Card';
import { useAdminStrings } from '@/lib/i18n-admin';
import { useAdminTelemetry } from '@/components/admin/dashboard/hooks/useAdminTelemetry';

const AdminToolsSection: React.FC = () => {
  const strings = useAdminStrings();
  const { sendEvent } = useAdminTelemetry('tools-overview');

  const handleClick = (tool: string) => {
    sendEvent('action_performed', { action: 'open_tool', metadata: { tool } });
  };

  return (
    <section aria-labelledby="admin-tools-overview" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="admin-tools-overview"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          {strings.tools.heading}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="flex flex-col justify-between p-4" variant="default">
          <div>
            <p className="text-sm font-semibold text-white">{strings.tools.webEval.title}</p>
            <p className="mt-1 text-sm text-white/60">{strings.tools.webEval.description}</p>
          </div>
          <div className="mt-3 flex justify-end">
            <a
              href="/admin/web-eval/tasks"
              onClick={() => handleClick('web-eval')}
              className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              {strings.tools.webEval.cta}
            </a>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-4" variant="default">
          <div>
            <p className="text-sm font-semibold text-white">{strings.tools.kpi.title}</p>
            <p className="mt-1 text-sm text-white/60">{strings.tools.kpi.description}</p>
          </div>
          <div className="mt-3 flex justify-end">
            <a
              href="#admin-kpi-overview"
              onClick={() => handleClick('kpi')}
              className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              {strings.tools.kpi.cta}
            </a>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-4" variant="default">
          <div>
            <p className="text-sm font-semibold text-white">{strings.tools.insights.title}</p>
            <p className="mt-1 text-sm text-white/60">{strings.tools.insights.description}</p>
          </div>
          <div className="mt-3 flex justify-end">
            <a
              href="#admin-user-insights"
              onClick={() => handleClick('user-insights')}
              className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              {strings.tools.insights.cta}
            </a>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-4" variant="default">
          <div>
            <p className="text-sm font-semibold text-white">{strings.tools.discounts.title}</p>
            <p className="mt-1 text-sm text-white/60">{strings.tools.discounts.description}</p>
          </div>
          <div className="mt-3 flex justify-end">
            <a
              href="#admin-discounts"
              onClick={() => handleClick('discounts')}
              className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              {strings.tools.discounts.cta}
            </a>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-4" variant="default">
          <div>
            <p className="text-sm font-semibold text-white">{strings.tools.audit.title}</p>
            <p className="mt-1 text-sm text-white/60">{strings.tools.audit.description}</p>
          </div>
          <div className="mt-3 flex justify-end">
            <a
              href="#admin-audit-monitoring"
              onClick={() => handleClick('audit')}
              className="inline-flex items-center rounded-md border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              {strings.tools.audit.cta}
            </a>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default AdminToolsSection;
