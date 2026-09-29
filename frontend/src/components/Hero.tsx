import { useEffect, useState } from 'react';
import { ArrowRight, FileText, Sparkles, CheckCircle2, TrendingUp, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Hero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [statusStep, setStatusStep] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusStep((prev) => (prev < 4 ? prev + 1 : 4));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const statuses = [
    "Uploading dataset...",
    "Understanding data...",
    "Finding patterns...",
    "Generating insights...",
    "Analysis complete"
  ];

  return (
    <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-36 border-b border-border/40">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-40 pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Column - Content */}
          <div className="max-w-2xl lg:max-w-none text-center lg:text-left z-10 flex flex-col items-center lg:items-start">
            {/* Brand / Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-foreground mb-8 animate-fade-in shadow-sm backdrop-blur-sm" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
              <Navigation className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold tracking-wide">
                DataPilot <span className="text-primary font-bold">&middot; AI</span>
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6 animate-fade-in-up leading-[1.1]" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              Talk to your data. <br className="hidden sm:block" />
              <span className="text-muted-foreground font-semibold">Discover what matters.</span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed animate-fade-in-up max-w-[600px]" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              Your AI-powered data analyst that turns CSV and Excel files into insights, interactive dashboards, and data-backed answers.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <Button 
                size="lg" 
                className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 text-base h-12 px-8"
                onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Try DataPilot AI
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="transition-all hover:bg-muted text-base h-12 px-8"
                onClick={() => document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See how it works
              </Button>
            </div>
          </div>

          {/* Right Column - Product Preview */}
          <div className="relative w-full aspect-[4/3] sm:aspect-auto sm:h-[500px] lg:h-[600px] animate-fade-in flex items-center justify-center lg:justify-end perspective-1000 mt-8 lg:mt-0" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
            <div 
              className="relative w-full max-w-[340px] sm:max-w-[420px] transition-transform duration-300 ease-out"
              style={{ transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)` }}
            >
              
              {/* Main Dashboard Card */}
              <div className="relative bg-card rounded-2xl border border-border shadow-2xl overflow-hidden backdrop-blur-sm bg-card/95">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shadow-inner">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm text-foreground">sales_2026.csv</h3>
                      <p className="text-[11px] text-muted-foreground font-medium">12,482 rows &bull; 14 columns</p>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 px-2 py-1 bg-background/50 rounded-full border border-border/50 shadow-sm">
                    {statusStep === 4 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse ml-1" />
                    )}
                    <span className="text-[10px] font-semibold text-muted-foreground pr-1">{statuses[statusStep]}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 space-y-6 bg-gradient-to-b from-background/50 to-muted/10">
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 rounded-xl border border-border/60 bg-card shadow-sm hover:border-primary/30 transition-colors group cursor-default">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Revenue</p>
                      <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">$1.24M</p>
                    </div>
                    <div className="p-3 sm:p-4 rounded-xl border border-border/60 bg-card shadow-sm hover:border-primary/30 transition-colors group cursor-default">
                      <p className="text-xs text-muted-foreground mb-1 font-medium">Growth</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-500 flex items-center gap-1 tracking-tight">
                        +18.4% <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
                      </p>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="relative h-44 w-full rounded-xl border border-border/60 bg-card p-4 flex flex-col justify-end group shadow-sm cursor-default">
                    <div className="absolute top-4 left-4">
                      <p className="text-xs font-semibold text-muted-foreground">Revenue Trend</p>
                    </div>
                    {/* Fake Chart SVG */}
                    <div className="w-full h-24 mt-6 relative overflow-hidden group-hover:scale-[1.01] transition-transform duration-500">
                      <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                        <path 
                          d="M0,80 C50,70 100,90 150,50 C200,10 250,60 300,30 C350,0 400,20 400,20" 
                          fill="none" 
                          stroke="currentColor"
                          className="text-primary animate-draw"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="1000"
                          strokeDashoffset="1000"
                          style={{ filter: 'drop-shadow(0px 4px 6px rgba(59, 130, 246, 0.25))' }}
                        />
                        <path 
                          d="M0,80 C50,70 100,90 150,50 C200,10 250,60 300,30 C350,0 400,20 400,20 L400,100 L0,100 Z" 
                          fill="url(#chart-gradient)" 
                          className="opacity-20 animate-fade-in"
                          style={{ animationDelay: '1s' }}
                        />
                        <defs>
                          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" className="text-primary" stopOpacity="1" />
                            <stop offset="100%" stopColor="currentColor" className="text-primary" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Interactive Data Points */}
                        <circle cx="300" cy="30" r="5" className="fill-background stroke-primary transition-all duration-300 hover:r-[7px] hover:stroke-[3px] opacity-0 animate-fade-in shadow-sm" strokeWidth="2.5" style={{ animationDelay: '1.5s', animationFillMode: 'both' }} />
                      </svg>
                      {/* Tooltip Simulation */}
                      <div className="absolute top-0 right-10 bg-popover/95 backdrop-blur text-popover-foreground text-xs px-2.5 py-1.5 rounded-md shadow-xl border border-border opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 font-medium z-10 pointer-events-none">
                        June: <span className="font-bold text-primary">$132K</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle Data Flow Text */}
                  <div className={`flex items-center gap-2 text-xs text-muted-foreground font-medium transition-all duration-500 ${statusStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
                    <span>AI found 3 significant trends</span>
                  </div>
                </div>
              </div>

              {/* Floating Insight Card */}
              <div 
                className="absolute -right-4 sm:-right-8 top-[35%] bg-card/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-border w-52 transition-transform duration-300 animate-fade-in-up z-20 pointer-events-none"
                style={{ 
                  transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`,
                  animationDelay: '1000ms',
                  animationFillMode: 'both' 
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-primary/10 rounded-md">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">AI Insight</h4>
                </div>
                <p className="text-[13px] text-foreground font-semibold mb-1 leading-tight">Revenue increased 18.4% this month</p>
                <p className="text-[11px] text-muted-foreground leading-snug">Electronics and Enterprise customers contributed most to the growth.</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
