import { useState } from 'react';
import { Filter, X, Calendar, Layers, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilterBarProps {
  dimensions?: Record<string, string[]>;
  activeFilters: Record<string, string>;
  onFilterChange: (dimension: string, value: string | null) => void;
  onClearFilters: () => void;
  aggregationMode: 'sum' | 'avg' | 'count';
  onAggregationChange: (mode: 'sum' | 'avg' | 'count') => void;
}

export function FilterBar({
  dimensions = {},
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  aggregationMode,
  onAggregationChange
}: FilterBarProps) {
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('All Time');

  const dimensionKeys = Object.keys(dimensions);
  const activeFilterCount = Object.keys(activeFilters).filter((k) => activeFilters[k]).length;

  return (
    <div className="border-b border-border/70 bg-card/60 backdrop-blur-md px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {/* Slicer Label */}
        <div className="flex items-center gap-1.5 font-bold text-foreground pr-2 border-r border-border/60">
          <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
          <span>Slicers</span>
        </div>

        {/* Date Range Slicer */}
        <div className="flex items-center gap-1">
          <select
            value={selectedDatePreset}
            onChange={(e) => setSelectedDatePreset(e.target.value)}
            className="h-7 px-2.5 rounded-md bg-background border border-border/80 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          >
            <option value="All Time">📅 Date: All Time</option>
            <option value="Last 30 Days">📅 Last 30 Days</option>
            <option value="Q1">📅 Q1 YTD</option>
            <option value="Q2">📅 Q2</option>
            <option value="Q3">📅 Q3</option>
            <option value="Q4">📅 Q4</option>
          </select>
        </div>

        {/* Dynamic Dimension Slicers from Dataset */}
        {dimensionKeys.slice(0, 3).map((dimKey) => {
          const options = dimensions[dimKey] || [];
          const currentValue = activeFilters[dimKey] || '';

          return (
            <div key={dimKey} className="flex items-center gap-1">
              <select
                value={currentValue}
                onChange={(e) => onFilterChange(dimKey, e.target.value || null)}
                className={`h-7 px-2.5 rounded-md border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs ${
                  currentValue
                    ? 'bg-primary/10 border-primary text-primary font-bold'
                    : 'bg-background border-border/80 text-foreground'
                }`}
              >
                <option value="">
                  {dimKey.replace(/_/g, ' ').toUpperCase()}: All
                </option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        {/* Aggregation Mode Switcher */}
        <div className="hidden sm:flex items-center bg-muted/60 rounded-md p-0.5 border border-border/60 ml-2">
          <button
            type="button"
            onClick={() => onAggregationChange('sum')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
              aggregationMode === 'sum'
                ? 'bg-background shadow-xs text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sum
          </button>
          <button
            type="button"
            onClick={() => onAggregationChange('avg')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
              aggregationMode === 'avg'
                ? 'bg-background shadow-xs text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Avg
          </button>
          <button
            type="button"
            onClick={() => onAggregationChange('count')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
              aggregationMode === 'count'
                ? 'bg-background shadow-xs text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Count
          </button>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
            {Object.entries(activeFilters).map(([dim, val]) => {
              if (!val) return null;
              return (
                <span
                  key={dim}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold border border-primary/25 animate-fade-in"
                >
                  <span>{dim}: {val}</span>
                  <button
                    type="button"
                    onClick={() => onFilterChange(dim, null)}
                    className="hover:text-destructive cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              );
            })}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="w-2.5 h-2.5 mr-1" /> Reset Slicers
            </Button>
          </div>
        )}
      </div>

      <div className="hidden lg:flex items-center gap-2 text-muted-foreground text-[11px]">
        <span>Cross-Filtering: <strong className="text-foreground">Active</strong></span>
      </div>
    </div>
  );
}
