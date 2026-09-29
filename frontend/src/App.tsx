import { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadDropzone } from './components/UploadDropzone';
import { Hero } from './components/Hero';
import { DashboardLayout } from './components/dashboard/DashboardLayout';

function App() {
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (datasetId) {
      setLoadingProfile(true);
      const interval = setInterval(async () => {
        try {
          const res = await axios.get('/api/datasets/' + datasetId + '/profile');
          setProfile(res.data);
          setLoadingProfile(false);
          clearInterval(interval);
        } catch (err) {
          // Waiting for profile to be ready
        }
      }, 2000);
      
      // Try to fetch dataset list to get the name
      axios.get('/api/datasets/').then((res) => {
        const ds = res.data.find((d: any) => d.id === datasetId);
        if (ds) setDatasetName(ds.filename);
      }).catch(console.error);

      return () => clearInterval(interval);
    } else {
      setProfile(null);
      setDatasetName(null);
    }
  }, [datasetId]);

  if (datasetId) {
    if (loadingProfile && !profile) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
           <p className="text-muted-foreground animate-pulse">Profiling dataset and generating insights...</p>
        </div>
      );
    }
    
    return (
      <DashboardLayout 
        datasetId={datasetId} 
        datasetName={datasetName} 
        profile={profile} 
        onSwitchDataset={() => setDatasetId(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center pl-8">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="text-primary">DataPilot</span> AI
          </div>
        </div>
      </header>

      <main className="w-full">
        <div className="flex flex-col w-full">
          <Hero />
          
          <div id="upload-section" className="py-24 px-4 bg-muted/10">
            <div className="container mx-auto">
              <div className="max-w-2xl mx-auto text-center mb-8">
                <h2 className="text-3xl font-bold tracking-tight mb-3">Get Started</h2>
                <p className="text-muted-foreground">Upload your CSV or Excel dataset to begin the analysis.</p>
              </div>
              <UploadDropzone onUploadSuccess={(id) => setDatasetId(id)} />
            </div>
          </div>

          <div id="how-it-works-section" className="py-24 px-4 border-t border-border/40">
            <div className="container mx-auto max-w-4xl text-center space-y-12">
              <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                <div className="space-y-4 p-6 rounded-2xl bg-card border border-border/50 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">1</div>
                  <h3 className="font-semibold text-lg">Upload Data</h3>
                  <p className="text-muted-foreground leading-relaxed">Securely upload your CSV or Excel file. We process it instantly without storing sensitive information unnecessarily.</p>
                </div>
                <div className="space-y-4 p-6 rounded-2xl bg-card border border-border/50 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">2</div>
                  <h3 className="font-semibold text-lg">AI Profiling</h3>
                  <p className="text-muted-foreground leading-relaxed">Our AI automatically analyzes your schema, detects data quality issues, and generates foundational dashboards.</p>
                </div>
                <div className="space-y-4 p-6 rounded-2xl bg-card border border-border/50 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">3</div>
                  <h3 className="font-semibold text-lg">Chat & Discover</h3>
                  <p className="text-muted-foreground leading-relaxed">Ask natural language questions to uncover hidden trends, generate new charts, and solve complex business problems.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

