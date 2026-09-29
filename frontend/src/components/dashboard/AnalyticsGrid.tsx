import { PowerBIChartCard } from './PowerBIChartCard';

interface AnalyticsGridProps {
  profile: any;
  onAskAI: (ctx: string) => void;
  activeFilter?: string | null;
}

export function AnalyticsGrid({ profile, onAskAI, activeFilter }: AnalyticsGridProps) {
  if (!profile || !profile.profile_data?.default_charts) return null;

  const charts = profile.profile_data.default_charts;

  if (charts.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-sm">
        No visual charts generated for this dataset schema yet.
      </div>
    );
  }

  // Layout arrangement:
  // Primary Time Series or first chart can span full width on xl screens if desired, or 2-column grid
  const primaryChart = charts[0];
  const secondaryCharts = charts.slice(1);

  return (
    <div className="space-y-6">
      {/* Visual Canvas Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {charts.map((chart: any) => (
          <PowerBIChartCard
            key={chart.id}
            chart={chart}
            onAskAI={onAskAI}
            activeFilter={activeFilter}
          />
        ))}
      </div>
    </div>
  );
}
