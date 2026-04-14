import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, FileText, Image, CheckCircle2, AlertCircle, 
  Loader2, Scan, Brain, FileSearch, Shield, X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { HealthDocument, ExtractedMetric } from '@/types/health';

interface BioVaultUploaderProps {
  onDocumentUploaded: (doc: HealthDocument) => void;
  onMetricExtracted: (metric: ExtractedMetric) => void;
}

interface UploadingFile {
  file: File;
  id: string;
  progress: number;
  status: 'uploading' | 'scanning' | 'analyzing' | 'complete' | 'error';
  extractedData?: Record<string, any>;
  errorMessage?: string;
}

export const BioVaultUploader: React.FC<BioVaultUploaderProps> = ({
  onDocumentUploaded,
  onMetricExtracted
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const updateFileState = (id: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const processFile = async (uploadFile: UploadingFile) => {
    if (!user?.id) {
      updateFileState(uploadFile.id, { status: 'error', errorMessage: 'Chưa đăng nhập' });
      return;
    }

    try {
      // Step 1: Upload to Supabase Storage
      const fileExt = uploadFile.file.name.split('.').pop();
      const storagePath = `${user.id}/${uploadFile.id}.${fileExt}`;

      for (let i = 0; i <= 80; i += 20) {
        await new Promise(r => setTimeout(r, 100));
        updateFileState(uploadFile.id, { progress: i });
      }

      const { error: uploadError } = await supabase.storage
        .from('biovault-documents')
        .upload(storagePath, uploadFile.file, { upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      updateFileState(uploadFile.id, { progress: 100 });

      // Step 2: Insert document record into DB
      updateFileState(uploadFile.id, { status: 'scanning', progress: 0 });

      const { data: docRecord, error: insertError } = await supabase
        .from('biovault_documents')
        .insert({
          user_id: user.id,
          file_name: uploadFile.file.name,
          file_type: uploadFile.file.type,
          file_path: storagePath,
          file_size: uploadFile.file.size,
          status: 'processing',
        } as any)
        .select()
        .single();

      if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

      // Step 3: Call Edge Function for AI analysis
      updateFileState(uploadFile.id, { status: 'analyzing', progress: 50 });

      const { data: analysisResult, error: fnError } = await supabase.functions.invoke(
        'analyze-health-document',
        {
          body: {
            documentId: (docRecord as any).id,
            filePath: storagePath,
            fileName: uploadFile.file.name,
            fileType: uploadFile.file.type,
          },
        }
      );

      if (fnError) throw new Error(`Analysis failed: ${fnError.message}`);

      const extractedData = analysisResult?.data || {};

      updateFileState(uploadFile.id, {
        status: 'complete',
        progress: 100,
        extractedData,
      });

      // Notify parent with document
      onDocumentUploaded({
        id: (docRecord as any).id,
        fileName: uploadFile.file.name,
        fileType: uploadFile.file.type,
        uploadedAt: new Date().toISOString(),
        status: 'analyzed',
        extractedData,
        icd11Codes: extractedData.icd11Codes || [],
      });

      // Notify parent with extracted metrics
      if (extractedData.metrics?.length) {
        extractedData.metrics.forEach((m: any, i: number) => {
          onMetricExtracted({
            id: `${(docRecord as any).id}-metric-${i}`,
            name: m.name,
            value: m.value,
            unit: m.unit,
            category: m.category || 'metabolic',
            icd11Code: m.icd11,
            riskLevel: (m.status as 'normal' | 'warning' | 'critical') || 'normal',
            extractedFrom: uploadFile.file.name,
            date: extractedData.date || new Date().toISOString().split('T')[0],
          });
        });
      }

      toast.success(t('biovault.upload.analysisComplete', 'Phân tích hoàn tất'), {
        description: `${extractedData.metrics?.length || 0} chỉ số được trích xuất`,
      });
    } catch (err: any) {
      console.error('Upload/analysis error:', err);
      updateFileState(uploadFile.id, {
        status: 'error',
        errorMessage: err.message,
      });
      toast.error('Lỗi xử lý tài liệu', { description: err.message });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadingFile[] = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      progress: 0,
      status: 'uploading' as const,
    }));
    setUploadingFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => processFile(f));
  }, [user?.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'uploading': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'scanning': return <Scan className="h-4 w-4 animate-pulse text-info" />;
      case 'analyzing': return <Brain className="h-4 w-4 animate-pulse text-warning" />;
      case 'complete': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusText = (status: UploadingFile['status']) => {
    switch (status) {
      case 'uploading': return t('biovault.upload.uploading', 'Đang tải lên Storage...');
      case 'scanning': return t('biovault.upload.scanning', 'Đang lưu vào cơ sở dữ liệu...');
      case 'analyzing': return t('biovault.upload.analyzing', 'AI đang phân tích & ánh xạ ICD-11...');
      case 'complete': return t('biovault.upload.complete', 'Hoàn tất');
      case 'error': return t('biovault.upload.error', 'Lỗi');
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-card/95 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {t('biovault.upload.title', 'Tải lên hồ sơ y tế')}
        </CardTitle>
        <CardDescription>
          {t('biovault.upload.description', 'File được lưu vào Supabase Storage, AI tự động quét, trích xuất chỉ số và ánh xạ mã ICD-11')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
            transition-all duration-300
            ${isDragActive 
              ? 'border-primary bg-primary/10 scale-[1.02]' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className={`h-8 w-8 text-primary ${isDragActive ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                {isDragActive 
                  ? t('biovault.upload.dropHere', 'Thả file tại đây') 
                  : t('biovault.upload.dragDrop', 'Kéo thả hoặc click để tải lên')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('biovault.upload.supportedFormats', 'Hỗ trợ: PDF, PNG, JPG (tối đa 10MB)')}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><FileText className="h-3 w-3" /><span>Kết quả xét nghiệm</span></div>
              <div className="flex items-center gap-1"><Image className="h-3 w-3" /><span>Ảnh chụp y tế</span></div>
              <div className="flex items-center gap-1"><FileSearch className="h-3 w-3" /><span>Đơn thuốc</span></div>
            </div>
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              {t('biovault.upload.encrypted', 'Lưu trữ bảo mật')}
            </Badge>
          </div>
        </div>

        {/* Uploading Files List */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Đang xử lý</h4>
            {uploadingFiles.map(file => (
              <div key={file.id} className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {file.file.type.includes('pdf') 
                      ? <FileText className="h-8 w-8 text-red-500" />
                      : <Image className="h-8 w-8 text-blue-500" />
                    }
                    <div>
                      <p className="font-medium text-sm text-foreground">{file.file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(file.status)}
                      <span className="text-xs text-muted-foreground">{getStatusText(file.status)}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(file.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {file.status !== 'complete' && file.status !== 'error' && (
                  <Progress value={file.progress} className="h-1.5" />
                )}

                {file.status === 'error' && file.errorMessage && (
                  <p className="text-xs text-destructive">{file.errorMessage}</p>
                )}

                {file.status === 'complete' && file.extractedData && (
                  <div className="mt-3 p-3 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium text-success">Dữ liệu trích xuất</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {file.extractedData.metrics?.map((m: any, i: number) => (
                        <div key={i} className="p-2 rounded bg-background/50 text-xs">
                          <div className="font-medium text-foreground">{m.name}</div>
                          <div className="text-muted-foreground">{m.value} {m.unit}</div>
                          <Badge 
                            variant="outline" 
                            className={`mt-1 text-[10px] ${
                              m.status === 'warning' ? 'border-warning text-warning' : 
                              m.status === 'critical' ? 'border-destructive text-destructive' :
                              'border-success text-success'
                            }`}
                          >
                            ICD-11: {m.icd11}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI Features Info */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          {[
            { icon: Scan, title: 'AI OCR', desc: 'Quét tự động văn bản' },
            { icon: Brain, title: 'NLP Analysis', desc: 'Hiểu ngữ cảnh y tế' },
            { icon: FileSearch, title: 'ICD-11 Mapping', desc: 'Ánh xạ mã chuẩn' },
          ].map((feature, i) => (
            <div key={i} className="text-center p-3 rounded-xl bg-muted/30">
              <feature.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
