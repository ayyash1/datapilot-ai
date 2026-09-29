import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, ArrowRight, Lightbulb, Zap, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SmartNarrativeProps {
  narratives?: Array<{
    type: string;
    badge: string;
    text: string;
  }>;
  onAskAI: (query: string) => void;
}

export function SmartNarrative({ narratives, onAskAI }: SmartNarrativeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!narratives || narratives.length === 0) return null;

  const getBadgeStyle = (badge: string) => {
    switch (badge.toLowerCase()) {
      case 'key driver':
      case 'segment lead':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'growth trend':
      case 'primary metric':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'data health':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const getIcon = (badge: string) => {
    switch (badge.toLowerCase()) {
      case 'key driver':
        return <Zap className="w-3.5 h-3.5" />;
      case 'growth trend':
        return <Lightbulb className="w-3.5 h-3.5" />;
      case 'data health':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <Card className="border-border/70 shadow-sm bg-gradient-to-r from-primary/5 via-card to-background overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight">AI Smart Narrative</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Executive Synthesis
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <span>Collapse</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Expand Insights</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="p-4 pt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
          {narratives.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-card border border-border/60 shadow-xs flex flex-col justify-between group hover:border-primary/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(item.badge)}`}
                  >
                    {getIcon(item.badge)}
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {item.text}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-border/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => onAskAI(`Explain this key takeaway in detail: "${item.text}"`)}
                  className="text-[11px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1 hover:underline cursor-pointer"
                >
                  Analyze trend <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
