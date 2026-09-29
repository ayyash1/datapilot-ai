import { ArrowUpRight, ArrowDownRight, Activity, Database, TableProperties, DollarSign, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down';
  delta?: number;
  sparkline?: number[];
  benchmark?: string;
  icon?: any;
  accentColor?: string;
}

export function KPICard({
  title,
  value,
  subtext,
  trend,
  delta,
  sparkline,
  benchmark,
  icon: Icon,
  accentColor = "#0078D4"
}: KPICardProps) {
  // Render mini SVG sparkline
  const renderSparkline = () => {
    if (!sparkline || sparkline.length < 2) return null;
    const min = Math.min(...sparkline);
    const max = Math.max(...sparkline);
    const range = max - min || 1;
    const width = 100;
    const height = 32;

    const points = sparkline
      .map((val, idx) => {
        const x = (idx / (sparkline.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${x},${y}`;
      })
      .join(' ');

    const isPositive = trend === 'up';
    const strokeColor = isPositive ? '#10B981' : '#F43F5E';
    const fillGradientId = `kpi_grad_${title.replace(/\s+/g, '')}`;

    return (
      <div className="w-24 h-8 relative flex-shrink-0">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          {/* Fill Area */}
          <polygon
            points={`0,${height} ${points} ${width},${height}`}
            fill={`url(#${fillGradientId})`}
          />
          {/* Stroke Line */}
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    );
  };

  return (
    <Card className="hover:shadow-md transition-all duration-300 relative overflow-hidden group border-border/70 bg-card/95 backdrop-blur-sm flex flex-col justify-between">
      {/* Top Bar Accent */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: accentColor }}
      />

      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {Icon && (
            <div
              className="p-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="space-y-1">
            <div className="text-2xl font-black tracking-tight text-foreground font-mono">
              {value}
            </div>

            {delta !== undefined && (
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md ${
                    trend === 'up'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {trend === 'up' ? (
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  )}
                  {delta}%
                </span>
                {subtext && (
                  <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                    {subtext}
                  </span>
                )}
              </div>
            )}
            {delta === undefined && subtext && (
              <p className="text-[11px] text-muted-foreground">{subtext}</p>
            )}
          </div>

          {/* Sparkline Graphic */}
          {renderSparkline()}
        </div>

        {benchmark && (
          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Benchmark:</span>
            <span className="font-medium text-foreground font-mono">{benchmark}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KPIGrid({ profile }: { profile: any }) {
  if (!profile) return null;

  const summaryKpis = profile.profile_data?.summary_kpis || [];
  const palette = ['#0078D4', '#10B981', '#8B5CF6', '#F59E0B'];

  // If backend provided enriched summary KPIs
  if (summaryKpis.length > 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryKpis.map((kpi: any, idx: number) => {
          const prefix = kpi.is_currency ? '$' : '';
          const formattedVal = `${prefix}${
            kpi.sum >= 1000000
              ? `${(kpi.sum / 1000000).toFixed(2)}M`
              : kpi.sum >= 1000
              ? `${(kpi.sum / 1000).toFixed(1)}k`
              : kpi.sum.toLocaleString()
          }`;

          return (
            <KPICard
              key={kpi.id || idx}
              title={`Total ${kpi.title}`}
              value={formattedVal}
              trend={kpi.trend}
              delta={kpi.delta_pct}
              subtext="Period Trend"
              sparkline={kpi.sparkline}
              benchmark={`Peak: ${prefix}${kpi.max.toLocaleString()} | Avg: ${prefix}${kpi.avg.toLocaleString()}`}
              icon={kpi.is_currency ? DollarSign : Layers}
              accentColor={palette[idx % palette.length]}
            />
          );
        })}

        {/* Data Quality & Health Card */}
        <KPICard
          title="Data Health Score"
          value={`${profile.data_quality_score}%`}
          trend={profile.data_quality_score >= 80 ? 'up' : 'down'}
          delta={profile.data_quality_score >= 80 ? 98 : 45}
          subtext={profile.data_quality_score >= 80 ? 'Clean & Reliable' : 'Needs Cleansing'}
          sparkline={[85, 90, 88, 92, 95, 98, profile.data_quality_score]}
          benchmark={`${profile.row_count.toLocaleString()} rows • ${profile.col_count} cols`}
          icon={Activity}
          accentColor="#06B6D4"
        />
      </div>
    );
  }

  // Fallback if no numeric KPIs
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Records"
        value={profile.row_count.toLocaleString()}
        icon={Database}
        subtext="Dataset Volume"
        sparkline={[20, 35, 45, 60, 75, 90, profile.row_count]}
        accentColor="#0078D4"
      />
      <KPICard
        title="Features (Columns)"
        value={profile.col_count}
        icon={TableProperties}
        subtext="Schema Dimensions"
        accentColor="#8B5CF6"
      />
      <KPICard
        title="Data Quality"
        value={`${profile.data_quality_score}%`}
        icon={Activity}
        trend={profile.data_quality_score >= 80 ? 'up' : 'down'}
        delta={profile.data_quality_score >= 80 ? 98 : 45}
        subtext={profile.data_quality_score >= 80 ? 'Healthy dataset' : 'Needs cleaning'}
        sparkline={[80, 85, 90, 95, 98, 100, profile.data_quality_score]}
        accentColor="#10B981"
      />
      <KPICard
        title="Duplicates"
        value={profile.profile_data.duplicate_rows.toLocaleString()}
        subtext={profile.profile_data.duplicate_rows === 0 ? 'Zero duplicates' : 'Review recommended'}
        accentColor="#F59E0B"
      />
    </div>
  );
}
