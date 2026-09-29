import { useState, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Maximize2, Download, MessageSquareText,
  TrendingUp, Sparkles, X
} from 'lucide-react';

const CHART_PALETTE = [
  '#0078D4', // Power BI Azure
  '#10B981', // Emerald Teal
  '#F59E0B', // Sunset Amber
  '#8B5CF6', // Royal Violet
  '#F43F5E', // Coral Rose
  '#06B6D4', // Cyan Sky
  '#EC4899', // Hot Pink
  '#3B82F6', // Blue Ribbon
];

interface PowerBIChartCardProps {
  chart: {
    id: string;
    title: string;
    subtitle?: string;
    type: 'area' | 'line' | 'bar' | 'donut' | 'composed' | string;
    category?: string;
    data: any[];
    x_key: string;
    y_key: string;
    secondary_y_key?: string;
    name_key?: string;
    total_sum?: number;
    available_metrics?: string[];
  };
  onAskAI: (chartContext: string) => void;
  activeFilter?: string | null;
}

// Custom formatted tooltip
function PowerBITooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-3 text-xs space-y-1.5 min-w-[160px] animate-fade-in z-50">
      <div className="font-semibold text-foreground border-b border-border/50 pb-1 flex items-center justify-between">
        <span className="truncate max-w-[150px]">{label || payload[0]?.name || 'Item'}</span>
        {payload[0]?.payload?.percentage !== undefined && (
          <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
            {payload[0].payload.percentage}%
          </span>
        )}
      </div>
      <div className="space-y-1 pt-0.5">
        {payload.map((entry: any, idx: number) => {
          const val = typeof entry.value === 'number'
            ? entry.value >= 1000
              ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : entry.value
            : entry.value;

          const isCurrency = entry.name && /sale|revenue|profit|price|cost|amount/i.test(entry.name);
          const formattedVal = isCurrency ? `$${val}` : String(val);

          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color || entry.fill || CHART_PALETTE[idx % CHART_PALETTE.length] }}
                />
                <span className="text-muted-foreground capitalize">
                  {entry.name?.replace(/_/g, ' ') || 'Value'}:
                </span>
              </div>
              <span className="font-bold text-foreground font-mono">{formattedVal}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PowerBIChartCard({ chart, onAskAI, activeFilter }: PowerBIChartCardProps) {
  const [chartType, setChartType] = useState(chart.type || 'bar');
  const [selectedMetric, setSelectedMetric] = useState(chart.y_key);
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [focusTab, setFocusTab] = useState<'visual' | 'data'>('visual');

  // Format tick labels
  const formatYAxis = (val: any): string => {
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  // Filtered dataset if activeFilter applies
  const chartData = useMemo(() => {
    if (!chart.data || chart.data.length === 0) return [];
    if (!activeFilter) return chart.data;
    return chart.data.filter((item) => {
      return Object.values(item).some(
        (val) => String(val).toLowerCase() === activeFilter.toLowerCase()
      );
    });
  }, [chart.data, activeFilter]);

  // Export CSV
  const handleExportCSV = () => {
    if (!chartData || chartData.length === 0) return;
    const headers = Object.keys(chartData[0]).join(',');
    const rows = chartData.map((row) =>
      Object.values(row)
        .map((v) => `"${v}"`)
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${chart.title.toLowerCase().replace(/\s+/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAskAI = () => {
    onAskAI(
      `Can you analyze the chart "${chart.title}"? The primary dimension is ${chart.x_key} and plotted metric is ${selectedMetric}. What are the major takeaways?`
    );
  };

  // Calculate sum for donut center if applicable
  const totalDonutSum = useMemo(() => {
    if (chartType !== 'donut') return null;
    return chartData.reduce((acc, curr) => acc + (Number(curr[selectedMetric]) || Number(curr.value) || 0), 0);
  }, [chartData, chartType, selectedMetric]);

  const renderChartVisual = (height: number | `${number}%` = 280) => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
          No data available for current filter selection
        </div>
      );
    }

    const primaryColor = CHART_PALETTE[0];
    const secondaryColor = CHART_PALETTE[1];
    const gradientId = `grad_${chart.id}_${selectedMetric}`;

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0.0} />
                </linearGradient>
                {chart.secondary_y_key && (
                  <linearGradient id={`${gradientId}_sec`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={secondaryColor} stopOpacity={0.0} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis
                dataKey={chart.x_key}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip content={<PowerBITooltip />} />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke={primaryColor}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={{ r: 3, fill: primaryColor, strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: primaryColor, fill: '#fff' }}
              />
              {chart.secondary_y_key && (
                <Area
                  type="monotone"
                  dataKey={chart.secondary_y_key}
                  stroke={secondaryColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId}_sec)`}
                  dot={{ r: 2, fill: secondaryColor }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis
                dataKey={chart.x_key}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip content={<PowerBITooltip />} />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={primaryColor}
                strokeWidth={3}
                dot={{ r: 4, fill: primaryColor, strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 7, strokeWidth: 2, stroke: primaryColor, fill: '#ffffff' }}
              />
              {chart.secondary_y_key && (
                <Line
                  type="monotone"
                  dataKey={chart.secondary_y_key}
                  stroke={secondaryColor}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: secondaryColor }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'donut':
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Tooltip content={<PowerBITooltip />} />
                <Pie
                  data={chartData}
                  dataKey={selectedMetric === chart.y_key ? 'value' : selectedMetric}
                  nameKey={chart.name_key || chart.x_key}
                  cx="50%"
                  cy="50%"
                  innerRadius={typeof height === 'number' && height > 350 ? 90 : 60}
                  outerRadius={typeof height === 'number' && height > 350 ? 140 : 95}
                  paddingAngle={3}
                  stroke="none"
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                      className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                    />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[120px] inline-block align-middle">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Summary Label */}
            {totalDonutSum !== null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-8">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total</span>
                <span className="text-base font-bold text-foreground">
                  {totalDonutSum >= 1000 ? `$${(totalDonutSum / 1000).toFixed(1)}k` : `$${totalDonutSum.toFixed(0)}`}
                </span>
              </div>
            )}
          </div>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis
                dataKey={chart.x_key}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              {chart.secondary_y_key && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                />
              )}
              <Tooltip content={<PowerBITooltip />} />
              <Bar
                yAxisId="left"
                dataKey={selectedMetric}
                fill={primaryColor}
                radius={[5, 5, 0, 0]}
                maxBarSize={45}
              />
              {chart.secondary_y_key && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={chart.secondary_y_key}
                  stroke={secondaryColor}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: secondaryColor }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis
                dataKey={chart.x_key}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip content={<PowerBITooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Bar
                dataKey={selectedMetric}
                fill={primaryColor}
                radius={[5, 5, 0, 0]}
                maxBarSize={48}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <>
      <Card className="group relative border-border/70 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden bg-card/95 backdrop-blur-sm">
        {/* Power BI Visual Header */}
        <CardHeader className="p-4 pb-2 border-b border-border/40 bg-muted/15 flex flex-row items-start justify-between space-y-0 gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground line-clamp-1">
                {chart.title}
              </CardTitle>
              {chart.category && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {chart.category}
                </span>
              )}
            </div>
            {chart.subtitle && (
              <CardDescription className="text-xs text-muted-foreground line-clamp-1">
                {chart.subtitle}
              </CardDescription>
            )}
          </div>

          {/* Visual Action Toolbar */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {/* Metric Switcher if available */}
            {chart.available_metrics && chart.available_metrics.length > 1 && (
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="text-[11px] h-7 px-2 rounded-md bg-background border border-border text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                title="Select Metric"
              >
                {chart.available_metrics.map((m) => (
                  <option key={m} value={m}>
                    {m.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            )}

            {/* Visual Type Pill Switcher */}
            <div className="flex items-center bg-muted/70 rounded-md p-0.5 border border-border/60">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`p-1 rounded-sm transition-colors ${chartType === 'area' ? 'bg-background shadow-xs text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                title="Area Spline Chart"
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`p-1 rounded-sm transition-colors ${chartType === 'bar' ? 'bg-background shadow-xs text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                title="Bar Chart"
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartType('donut')}
                className={`p-1 rounded-sm transition-colors ${chartType === 'donut' ? 'bg-background shadow-xs text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                title="Donut Distribution"
              >
                <PieChartIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`p-1 rounded-sm transition-colors ${chartType === 'line' ? 'bg-background shadow-xs text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                title="Line Trend"
              >
                <LineChartIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Ask AI Context */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={handleAskAI}
              title="Ask AI about this visual"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
            </Button>

            {/* Focus Mode */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setIsFocusOpen(true)}
              title="Focus Mode (Maximize)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardHeader>

        {/* Visual Content Canvas */}
        <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-center">
          <div className="h-[280px] w-full mt-2">
            {renderChartVisual(280)}
          </div>
        </CardContent>
      </Card>

      {/* Focus Mode Fullscreen Modal */}
      {isFocusOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 lg:p-10 animate-fade-in">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary font-bold">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{chart.title}</h3>
                  <p className="text-xs text-muted-foreground">Power BI Focus Mode Visualizer & Data Inspector</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* View Switcher */}
                <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
                  <button
                    onClick={() => setFocusTab('visual')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${focusTab === 'visual' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                  >
                    Visual View
                  </button>
                  <button
                    onClick={() => setFocusTab('data')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${focusTab === 'data' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                  >
                    Data Table
                  </button>
                </div>

                <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 gap-1 text-xs">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-muted"
                  onClick={() => setIsFocusOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              {focusTab === 'visual' ? (
                <div className="flex-1 w-full h-full min-h-[400px]">
                  {renderChartVisual('100%')}
                </div>
              ) : (
                <div className="flex-1 overflow-auto border border-border rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/60 sticky top-0 border-b border-border font-semibold text-foreground">
                      <tr>
                        {chartData.length > 0 &&
                          Object.keys(chartData[0]).map((key) => (
                            <th key={key} className="p-3 uppercase tracking-wider text-[10px] text-muted-foreground">
                              {key}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {chartData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          {Object.keys(row).map((key) => (
                            <td key={key} className="p-3 text-foreground font-mono">
                              {String(row[key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer with AI Insights Shortcut */}
            <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Need deeper analysis on this data?</span>
              </div>
              <Button
                size="sm"
                className="gap-2 text-xs"
                onClick={() => {
                  setIsFocusOpen(false);
                  handleAskAI();
                }}
              >
                <MessageSquareText className="w-3.5 h-3.5" /> Ask Copilot
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
