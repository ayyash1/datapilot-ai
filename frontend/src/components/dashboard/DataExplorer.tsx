import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft, ChevronRight, Loader2, Table2, Search,
  Download, ArrowUpDown, ArrowUp, ArrowDown, Hash, Calendar, Type, Sliders
} from 'lucide-react';

interface DataExplorerProps {
  datasetId: number;
}

export function DataExplorer({ datasetId }: DataExplorerProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isCompact, setIsCompact] = useState(false);

  const limit = 15;

  useEffect(() => {
    if (!datasetId) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`/api/datasets/${datasetId}/data`, {
          params: { page, limit }
        });
        if (isMounted) {
          setData(res.data.data);
          setTotalPages(res.data.total_pages);
          setTotalRows(res.data.total_rows);
        }
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.detail || 'Failed to load data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [datasetId, page]);

  // Extract columns
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  // Filtered and sorted data
  const displayedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    // Sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const numA = Number(valA);
        const numB = Number(valB);

        if (!isNaN(numA) && !isNaN(numB)) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, searchTerm, sortColumn, sortDirection]);

  // Handle Sort toggle
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Export full table or current view to CSV
  const handleExportCSV = () => {
    if (!data.length) return;
    const headers = columns.join(',');
    const rows = displayedData.map((row) =>
      columns.map((c) => `"${row[c] !== undefined ? row[c] : ''}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dataset_${datasetId}_page_${page}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for column icon
  const getColIcon = (colName: string) => {
    if (/date|time|year|month/i.test(colName)) return <Calendar className="w-3 h-3 text-blue-500" />;
    if (/sale|price|cost|revenue|profit|amount|qty|count|id|score|num/i.test(colName))
      return <Hash className="w-3 h-3 text-emerald-500" />;
    return <Type className="w-3 h-3 text-muted-foreground" />;
  };

  if (error) {
    return (
      <Card className="border-border/70">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm flex flex-col overflow-hidden bg-card/95 backdrop-blur-sm">
      {/* Matrix Header */}
      <CardHeader className="p-4 pb-3 border-b border-border/40 bg-muted/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <Table2 className="w-4 h-4" />
            </div>
            <span>Data Matrix & Tabular View</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Interactive spreadsheet grid with live search, sorting, and export
          </CardDescription>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Instant Search input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-background shadow-2xs rounded-lg"
            />
          </div>

          {/* Density Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCompact(!isCompact)}
            className="h-8 text-xs px-2.5"
            title="Toggle Row Density"
          >
            <Sliders className="w-3.5 h-3.5 mr-1" />
            {isCompact ? 'Comfortable' : 'Compact'}
          </Button>

          {/* Export to CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs px-2.5 gap-1 shadow-2xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </Button>
        </div>
      </CardHeader>

      {/* Matrix Table View */}
      <CardContent className="p-0 flex-1 flex flex-col min-h-[380px]">
        {loading && data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Streaming data records...</span>
          </div>
        ) : (
          <>
            <div className="overflow-auto flex-1 custom-scrollbar max-h-[500px]">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10 border-b border-border shadow-2xs">
                  <TableRow className="hover:bg-transparent">
                    {columns.map((col) => (
                      <TableHead
                        key={col}
                        onClick={() => handleSort(col)}
                        className="whitespace-nowrap font-bold text-foreground text-xs py-2.5 px-3 cursor-pointer select-none hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          {getColIcon(col)}
                          <span>{col}</span>
                          {sortColumn === col ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-primary" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/40">
                  {displayedData.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className="hover:bg-primary/5 transition-colors group"
                    >
                      {columns.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined || val === '';
                        const isNumeric = typeof val === 'number' || (!isNaN(Number(val)) && val !== '');
                        const isCurrency = isNumeric && /sale|price|cost|revenue|profit|amount/i.test(col);

                        return (
                          <TableCell
                            key={`${idx}-${col}`}
                            className={`max-w-[220px] truncate font-mono text-xs ${
                              isCompact ? 'py-1.5 px-3' : 'py-2.5 px-3'
                            } ${isNumeric ? 'text-right' : 'text-left'}`}
                          >
                            {isNull ? (
                              <span className="text-muted-foreground/50 italic text-[10px]">null</span>
                            ) : isCurrency ? (
                              <span className="font-semibold text-foreground">
                                ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-foreground">{String(val)}</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {displayedData.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={columns.length || 1} className="text-center py-12 text-muted-foreground text-xs">
                        No matching records found for "{searchTerm}"
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination & Status Footer */}
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-2">
                <span>
                  Showing{' '}
                  <strong className="text-foreground">
                    {totalRows === 0 ? 0 : (page - 1) * limit + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-foreground">
                    {Math.min(page * limit, totalRows)}
                  </strong>{' '}
                  of <strong className="text-foreground">{totalRows.toLocaleString()}</strong> rows
                </span>
                {searchTerm && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                    {displayedData.length} filtered
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="h-7 text-xs px-2 shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Prev
                </Button>
                <div className="text-xs font-semibold px-2 text-foreground font-mono">
                  {page} / {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="h-7 text-xs px-2 shadow-2xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
