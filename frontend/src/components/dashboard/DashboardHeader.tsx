import { Moon, Sun, Database, LayoutDashboard, BarChart2, Table2, ShieldCheck, Sparkles, SlidersHorizontal, Download, FileSpreadsheet } from "lucide-react";
import { useTheme } from "../theme-provider";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  datasetName: string | null;
  onSwitchDataset: () => void;
  activeTab: 'overview' | 'visuals' | 'matrix' | 'health';
  onTabChange: (tab: 'overview' | 'visuals' | 'matrix' | 'health') => void;
  showSlicers: boolean;
  onToggleSlicers: () => void;
  showAIPanel: boolean;
  onToggleAIPanel: () => void;
  rowCount?: number;
}

export function DashboardHeader({
  datasetName,
  onSwitchDataset,
  activeTab,
  onTabChange,
  showSlicers,
  onToggleSlicers,
  showAIPanel,
  onToggleAIPanel,
  rowCount
}: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-2xs">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 gap-3">
        {/* Left: Branding & Dataset Pill */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 font-black text-base text-foreground select-none">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-xs flex items-center justify-center">
              <BarChart2 className="w-4 h-4" />
            </div>
            <span className="tracking-tight">
              <span className="text-primary font-black">DataPilot</span>{' '}
              <span className="font-extrabold text-foreground">BI</span>
            </span>
          </div>

          {/* Dataset Switcher Pill */}
          {datasetName && (
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-border/70 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchDataset}
                className="h-7 px-2.5 bg-muted/30 hover:bg-muted font-medium shadow-2xs flex items-center gap-1.5 border-border/80"
                title="Click to Switch or Upload Dataset"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                <span className="truncate max-w-[150px] font-bold text-foreground">{datasetName}</span>
                <span className="text-muted-foreground text-[10px]">▾</span>
              </Button>
              {rowCount !== undefined && (
                <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-mono font-medium">
                  {rowCount.toLocaleString()} rows
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center: Power BI View Mode Navigation Tabs */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/70 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => onTabChange('overview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-background shadow-xs text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Executive</span> Overview
          </button>

          <button
            type="button"
            onClick={() => onTabChange('visuals')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'visuals'
                ? 'bg-background shadow-xs text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Visuals</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'matrix'
                ? 'bg-background shadow-xs text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Data Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('health')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'health'
                ? 'bg-background shadow-xs text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Data</span> Health
          </button>
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Slicers Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSlicers}
            className={`h-8 px-2.5 text-xs shadow-2xs font-medium ${
              showSlicers ? 'bg-primary/10 border-primary text-primary font-bold' : ''
            }`}
            title="Toggle Slicers Ribbon"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Slicers</span>
          </Button>

          {/* AI Copilot Drawer Toggle */}
          <Button
            size="sm"
            onClick={onToggleAIPanel}
            className={`h-8 px-2.5 text-xs shadow-xs font-semibold gap-1.5 ${
              showAIPanel
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/70 text-foreground hover:bg-muted border border-border/80'
            }`}
            title="Toggle AI Analyst Copilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">AI Copilot</span>
          </Button>

          {/* Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Toggle Theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
