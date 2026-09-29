import React, { useCallback, useState } from 'react';
import { UploadCloud, File as FileIcon, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface UploadDropzoneProps {
  onUploadSuccess: (datasetId: number) => void;
}

export function UploadDropzone({ onUploadSuccess }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setStatus('error');
      setErrorMsg('Only CSV or Excel files are allowed.');
      return;
    }
    setFile(file);
    setStatus('idle');
    setErrorMsg('');
  };

  const uploadFile = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/datasets/upload', true);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setStatus('success');
          onUploadSuccess(response.id);
        } else {
          setStatus('error');
          setErrorMsg(JSON.parse(xhr.responseText).detail || 'Upload failed');
        }
      };

      xhr.onerror = () => {
        setStatus('error');
        setErrorMsg('Network error occurred.');
      };

      xhr.send(formData);
    } catch (error: any) {
      setStatus('error');
      setErrorMsg(error.message || 'An error occurred.');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-8">
      <div 
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:bg-accent/50",
          status === 'success' && "border-green-500 bg-green-500/5",
          status === 'error' && "border-destructive bg-destructive/5"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".csv,.xlsx"
          onChange={handleChange}
        />
        
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-4 text-green-600">
            <CheckCircle className="w-12 h-12" />
            <h3 className="font-semibold text-lg">Upload Complete</h3>
            <p className="text-sm text-muted-foreground">{file?.name}</p>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-4 text-destructive">
            <XCircle className="w-12 h-12" />
            <h3 className="font-semibold text-lg">Upload Failed</h3>
            <p className="text-sm">{errorMsg}</p>
            <Button variant="outline" onClick={() => setStatus('idle')} className="mt-2">Try Again</Button>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center gap-4">
            <FileIcon className="w-12 h-12 text-primary" />
            <h3 className="font-semibold text-lg">{file.name}</h3>
            <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            
            {status === 'uploading' ? (
              <div className="w-full mt-4 space-y-2">
                <Progress value={progress} className="h-2 w-full" />
                <p className="text-sm text-muted-foreground">{Math.round(progress)}% Uploaded</p>
              </div>
            ) : (
              <div className="flex gap-4 mt-4">
                <Button variant="outline" onClick={() => setFile(null)}>Cancel</Button>
                <Button onClick={uploadFile}>Upload Dataset</Button>
              </div>
            )}
          </div>
        ) : (
          <label htmlFor="file-upload" className="flex flex-col items-center gap-4 cursor-pointer">
            <div className="p-4 rounded-full bg-primary/10">
              <UploadCloud className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Click or drag file to this area to upload</h3>
              <p className="text-sm text-muted-foreground mt-2">Support for a single CSV or Excel upload.</p>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
