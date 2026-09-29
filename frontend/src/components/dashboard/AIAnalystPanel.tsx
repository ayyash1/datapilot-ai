import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bot, User, Code2, Database, CheckCircle, Send,
  Activity, Sparkles, Trash2, ArrowRight, CornerDownLeft
} from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  content: string;
  agent_used?: string;
  code_generated?: string;
  sql_generated?: string;
  evaluation?: any;
}

export function AIAnalystPanel({
  datasetId,
  externalQuery,
  onClearQuery
}: {
  datasetId: number;
  externalQuery: string;
  onClearQuery: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content:
        'Hello! I am your AI Data Analyst. Ask me anything about trends, anomalies, or summaries across this dataset.'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalQuery) {
      sendMessage(externalQuery);
      onClearQuery();
    }
  }, [externalQuery, onClearQuery]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (overrideMsg?: string) => {
    const msgToSend = (overrideMsg || inputMessage).trim();
    if (!msgToSend || !datasetId) return;

    setMessages((prev) => [...prev, { role: 'user', content: msgToSend }]);
    if (!overrideMsg) setInputMessage('');
    setIsTyping(true);

    try {
      const res = await axios.post('/api/chat/', {
        dataset_id: datasetId,
        query: msgToSend
      });

      const data = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: data.response,
          agent_used: data.agent_used,
          code_generated: data.code_generated,
          sql_generated: data.sql_generated,
          evaluation: data.evaluation
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content:
            'Sorry, I encountered an issue processing your request. Please ensure the backend agent services are running.'
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'ai',
        content:
          'Chat history reset. How can I assist you with this dataset?'
      }
    ]);
  };

  return (
    <Card className="h-full flex flex-col border-0 rounded-none shadow-none bg-card/95 backdrop-blur-md">
      {/* Header */}
      <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
              <span>DataPilot Copilot</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              AI-Powered Analytical Assistant
            </CardDescription>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={clearChat}
          title="Clear Conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>

      {/* Messages Scroll Area */}
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-primary">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-xs font-medium'
                    : 'bg-muted/60 border border-border/70 text-foreground rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Technical Inspector Accordion */}
                {(msg.agent_used || msg.sql_generated || msg.code_generated || msg.evaluation) && (
                  <div className="mt-3 pt-2.5 border-t border-border/50 space-y-2 text-[11px]">
                    {msg.agent_used && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        <span>
                          Agent: <strong className="text-foreground">{msg.agent_used}</strong>
                        </span>
                      </div>
                    )}

                    {msg.sql_generated && (
                      <div className="p-2 rounded-lg bg-background border border-border/60 font-mono text-[10px] overflow-x-auto">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1 font-sans font-bold">
                          <Database className="w-3 h-3 text-blue-500" /> SQL Query:
                        </div>
                        <code>{msg.sql_generated}</code>
                      </div>
                    )}

                    {msg.code_generated && (
                      <div className="p-2 rounded-lg bg-background border border-border/60 font-mono text-[10px] overflow-x-auto">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1 font-sans font-bold">
                          <Code2 className="w-3 h-3 text-amber-500" /> Python Code:
                        </div>
                        <code>{msg.code_generated}</code>
                      </div>
                    )}

                    {msg.evaluation && !msg.evaluation.error && (
                      <div className="flex items-center justify-between text-muted-foreground bg-background/60 p-1.5 rounded-md border border-border/40 text-[10px]">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-blue-500" /> Confidence
                        </span>
                        <strong className="text-foreground font-mono">
                          {msg.evaluation.accuracy_score || 95}%
                        </strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5 text-primary-foreground shadow-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-primary">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-muted/60 border border-border/70 rounded-2xl rounded-tl-xs p-3 flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input Bar & Suggested Prompts */}
        <div className="p-3 bg-background border-t border-border/60 space-y-2.5">
          {/* Quick Prompts */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => sendMessage('What are the key drivers of growth in this dataset?')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap cursor-pointer"
            >
              🚀 Key Drivers
            </button>
            <button
              type="button"
              onClick={() => sendMessage('Detect anomalies and unusual outliers in the records.')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap cursor-pointer"
            >
              ⚠️ Outliers
            </button>
            <button
              type="button"
              onClick={() => sendMessage('Summarize top products and categories by performance.')}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap cursor-pointer"
            >
              📊 Breakdown
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="relative flex items-center"
          >
            <Input
              placeholder="Ask Copilot about your data..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isTyping}
              className="pr-10 h-10 bg-muted/20 border-border/80 text-xs shadow-2xs rounded-xl focus-visible:ring-primary/20"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isTyping || !inputMessage.trim()}
              className="absolute right-1.5 h-7 w-7 rounded-lg shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
