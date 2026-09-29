import { useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { FilterBar } from './FilterBar';
import { KPIGrid } from './KPIGrid';
import { SmartNarrative } from './SmartNarrative';
import { AnalyticsGrid } from './AnalyticsGrid';
import { DataExplorer } from './DataExplorer';
import { DataQualityCard } from './DataQualityCard';
import { AIAnalystPanel } from './AIAnalystPanel';
import { LayoutDashboard, Sparkles, SlidersHorizontal, Table2, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  datasetId: number;
  profile: any;
  datasetName: string | null;
  onSwitchDataset: () => void;
}

export function DashboardLayout({
  datasetId,
  profile,
  datasetName,
  onSwitchDataset
}: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'visuals' | 'matrix' | 'health'>('overview');
  const [showSlicers, setShowSlicers] = useState(true);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [aggregationMode, setAggregationMode] = useState<'sum' | 'avg' | 'count'>('sum');
  const [aiQuery, setAiQuery] = useState('');

  const handleFilterChange = (dimension: string, value: string | null) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (value) {
        next[dimension] = value;
      } else {
        delete next[dimension];
      }
      return next;
    });
  };

  const handleClearFilters = () => {
    setActiveFilters({});
  };

  const handleAskAI = (contextQuery: string) => {
    setAiQuery(contextQuery);
    setShowAIPanel(true);
  };

  // Find active single filter value for visual highlighting
  const activeFilterValue = Object.values(activeFilters)[0] || null;

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Application Header */}
      <DashboardHeader
        datasetName={datasetName}
        onSwitchDataset={onSwitchDataset}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSlicers={showSlicers}
        onToggleSlicers={() => setShowSlicers(!showSlicers)}
        showAIPanel={showAIPanel}
        onToggleAIPanel={() => setShowAIPanel(!showAIPanel)}
        rowCount={profile?.row_count}
      />

      {/* Slicers Ribbon */}
      {showSlicers && (
        <FilterBar
          dimensions={profile?.profile_data?.dimensions}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          aggregationMode={aggregationMode}
          onAggregationChange={setAggregationMode}
        />
      )}

      {/* Main Workspace with Copilot Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Canvas Area */}
        <main className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto w-full">
            {/* View Mode 1: Executive Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* Executive Title & Context */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                      Executive Analytics Dashboard
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Synthesized performance indicators, automated smart narratives, and multi-dimensional visual models.
                    </p>
                  </div>
                </div>

                {/* KPI Scorecards */}
                <KPIGrid profile={profile} />

                {/* AI Smart Narrative Executive Banner */}
                <SmartNarrative
                  narratives={profile?.profile_data?.smart_narratives}
                  onAskAI={handleAskAI}
                />

                {/* Power BI Visuals Canvas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground tracking-tight">
                      Visual Models & Distribution Analytics
                    </h3>
                  </div>
                  <AnalyticsGrid
                    profile={profile}
                    onAskAI={handleAskAI}
                    activeFilter={activeFilterValue}
                  />
                </div>

                {/* Data Matrix & Schema Health Split */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 pt-2">
                  <div className="xl:col-span-3">
                    <DataExplorer datasetId={datasetId} />
                  </div>
                  <div className="xl:col-span-2">
                    <DataQualityCard profile={profile} />
                  </div>
                </div>
              </div>
            )}

            {/* View Mode 2: Visuals Canvas */}
            {activeTab === 'visuals' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    Interactive Visual Analytics
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Explore multi-metric trends, rankings, and proportion distributions with custom chart controls.
                  </p>
                </div>

                <KPIGrid profile={profile} />

                <AnalyticsGrid
                  profile={profile}
                  onAskAI={handleAskAI}
                  activeFilter={activeFilterValue}
                />
              </div>
            )}

            {/* View Mode 3: Data Matrix */}
            {activeTab === 'matrix' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    Tabular Data Matrix
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Inspect raw dataset rows, sort by features, search records, and export to CSV.
                  </p>
                </div>

                <DataExplorer datasetId={datasetId} />
              </div>
            )}

            {/* View Mode 4: Data Health */}
            {activeTab === 'health' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                    Dataset Schema & Data Quality Profile
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Data types, missing value percentages, and schema cardinality.
                  </p>
                </div>

                <DataQualityCard profile={profile} />
              </div>
            )}
          </div>
        </main>

        {/* AI Copilot Side Panel */}
        {showAIPanel && (
          <aside className="w-[380px] xl:w-[420px] border-l border-border/80 bg-card/50 backdrop-blur-md hidden lg:flex flex-col sticky top-0 h-[calc(100vh-3.5rem)] overflow-hidden animate-fade-in shadow-xl z-30">
            <AIAnalystPanel
              datasetId={datasetId}
              externalQuery={aiQuery}
              onClearQuery={() => setAiQuery('')}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
