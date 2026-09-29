import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertCircle, CheckCircle2, Hash, Calendar, Type, HelpCircle } from 'lucide-react';

export function DataQualityCard({ profile }: { profile: any }) {
  if (!profile || !profile.profile_data?.columns) return null;

  const score = profile.data_quality_score || 0;
  const isHealthy = score >= 80;

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'numeric':
      case 'int64':
      case 'float64':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
            <Hash className="w-3 h-3" /> Numeric
          </span>
        );
      case 'date':
      case 'datetime64[ns]':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
            <Calendar className="w-3 h-3" /> Date
          </span>
        );
      case 'categorical':
      case 'object':
      case 'string':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold border border-purple-500/20">
            <Type className="w-3 h-3" /> Category
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold border border-border">
            {type}
          </span>
        );
    }
  };

  return (
    <Card className="border-border/70 shadow-sm flex flex-col overflow-hidden bg-card/95 backdrop-blur-sm">
      <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/15 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Schema & Data Quality Profile</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Feature metadata, missing rate, and type integrity
          </CardDescription>
        </div>

        {/* Quality Score Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isHealthy
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
          }`}
        >
          {isHealthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span>{score}% Quality Score</span>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <div className="max-h-[380px] overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10 border-b border-border text-xs">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-foreground py-2 px-3">Column Name</TableHead>
                <TableHead className="font-bold text-foreground py-2 px-3">Inferred Type</TableHead>
                <TableHead className="font-bold text-foreground py-2 px-3">Missing Rate</TableHead>
                <TableHead className="font-bold text-foreground py-2 px-3 text-right">Unique Values</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40 text-xs">
              {profile.profile_data.columns.map((col: any) => (
                <TableRow key={col.name} className="hover:bg-muted/20">
                  <TableCell className="font-semibold text-foreground py-2.5 px-3">
                    {col.name}
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    {getTypeBadge(col.type)}
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    {col.missing_count > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full"
                            style={{ width: `${Math.min(100, col.missing_percentage)}%` }}
                          />
                        </div>
                        <span className="text-rose-500 font-bold font-mono text-[11px]">
                          {col.missing_percentage.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[11px]">
                        0% (Clean)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground py-2.5 px-3 font-semibold">
                    {col.unique_count.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
