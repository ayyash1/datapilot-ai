import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { UploadDropzone } from './components/UploadDropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, User, Code2, Database, CheckCircle, Send, Activity } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  content: string;
  agent_used?: string;
  code_generated?: string;
  sql_generated?: string;
  evaluation?: any;
}

function App() {
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hello! I am DataPilot AI. Ask me anything about your dataset.' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (datasetId) {
      setLoadingProfile(true);
      const interval = setInterval(async () => {
        try {
          const res = await axios.get('http://localhost:8000/api/datasets/' + datasetId + '/profile');
          setProfile(res.data);
          setLoadingProfile(false);
          clearInterval(interval);
        } catch (err) {
        }
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setProfile(null);
      setMessages([{ role: 'ai', content: 'Hello! I am DataPilot AI. Ask me anything about your dataset.' }]);
    }
  }, [datasetId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !datasetId) return;
    
    const userMsg = inputMessage.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputMessage('');
    setIsTyping(true);
    
    try {
      const res = await axios.post('http://localhost:8000/api/chat/', {
        dataset_id: datasetId,
        query: userMsg
      });
      
      const data = res.data;
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: data.response,
        agent_used: data.agent_used,
        code_generated: data.code_generated,
        sql_generated: data.sql_generated,
        evaluation: data.evaluation
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error processing your request. Please check if your API keys are configured correctly.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center pl-8">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="text-primary">DataPilot</span> AI
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {!datasetId ? (
          <div className="flex flex-col items-center justify-center space-y-6 text-center py-24">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                Talk to your data. <br /> Discover what matters.
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                An AI-powered data analyst that transforms raw datasets into insights, dashboards, and actionable answers.
              </p>
            </div>
            <UploadDropzone onUploadSuccess={(id) => setDatasetId(id)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">Dataset Dashboard</h2>
                <button 
                  className="text-sm font-medium text-primary hover:underline"
                  onClick={() => setDatasetId(null)}
                >
                  Upload another dataset
                </button>
              </div>

              {loadingProfile && !profile && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground">Profiling dataset and generating insights...</p>
                </div>
              )}

              {profile && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{profile.row_count.toLocaleString()}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Columns</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{profile.col_count}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold">{profile.data_quality_score}%</div>
                          <Progress value={profile.data_quality_score} className="h-2 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Duplicates</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{profile.profile_data.duplicate_rows}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {profile.profile_data.default_charts && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {profile.profile_data.default_charts.map((chart: any) => (
                        <Card key={chart.id}>
                          <CardHeader>
                            <CardTitle>{chart.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                {chart.type === 'line' ? (
                                  <LineChart data={chart.data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey={chart.x_key} />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey={chart.y_key} stroke="#8884d8" />
                                  </LineChart>
                                ) : (
                                  <BarChart data={chart.data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey={chart.x_key} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey={chart.y_key} fill="#82ca9d" />
                                  </BarChart>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Column Schema</CardTitle>
                      <CardDescription>Overview of data types and missing values in your dataset.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[300px] overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Column Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Missing</TableHead>
                              <TableHead>Unique Values</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {profile.profile_data.columns.map((col: any) => (
                              <TableRow key={col.name}>
                                <TableCell className="font-medium">{col.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{col.type}</Badge>
                                </TableCell>
                                <TableCell>
                                  {col.missing_count > 0 ? (
                                    <span className="text-destructive font-medium">{col.missing_percentage.toFixed(1)}% ({col.missing_count})</span>
                                  ) : (
                                    <span className="text-muted-foreground">0%</span>
                                  )}
                                </TableCell>
                                <TableCell>{col.unique_count.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-1 h-[calc(100vh-8rem)] sticky top-24">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    AI Analyst
                  </CardTitle>
                  <CardDescription>Ask natural language questions about your data.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-xl p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <div className="text-sm">{msg.content}</div>
                          
                          {(msg.agent_used || msg.code_generated || msg.sql_generated || msg.evaluation) && (
                            <div className="mt-3 space-y-2 border-t border-border/50 pt-2">
                              {msg.agent_used && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  Analyzed using: <span className="font-medium text-foreground">{msg.agent_used}</span>
                                </div>
                              )}
                              {msg.sql_generated && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background rounded p-1.5 border border-border/50 font-mono">
                                  <Database className="w-3 h-3" />
                                  <span className="truncate">{msg.sql_generated.substring(0, 50)}...</span>
                                </div>
                              )}
                              {msg.code_generated && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background rounded p-1.5 border border-border/50 font-mono">
                                  <Code2 className="w-3 h-3" />
                                  <span className="truncate">{msg.code_generated.substring(0, 50)}...</span>
                                </div>
                              )}
                              {msg.evaluation && !msg.evaluation.error && (
                                <div className="flex items-center justify-between text-xs text-muted-foreground bg-background rounded p-1.5 border border-border/50">
                                  <div className="flex items-center gap-1.5">
                                    <Activity className="w-3 h-3 text-blue-500" />
                                    <span>Accuracy: {msg.evaluation.accuracy_score}%</span>
                                  </div>
                                  <span title={msg.evaluation.feedback}>?</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-xl p-4 flex gap-1 items-center">
                          <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" />
                          <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <div className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-background border-t">
                    <form 
                      onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                      className="flex gap-2"
                    >
                      <Input 
                        placeholder="E.g., Why did revenue drop in March?" 
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        disabled={isTyping}
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={isTyping || !inputMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
