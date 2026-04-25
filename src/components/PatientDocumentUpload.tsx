import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, FileText, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PatientDocumentUploadProps {
  patientId: string;
  onUploadComplete?: () => void;
}

interface UploadFile {
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  documentType: string;
  notes: string;
}

export function PatientDocumentUpload({ patientId, onUploadComplete }: PatientDocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      progress: 0,
      status: 'pending' as const,
      documentType: 'general',
      notes: ''
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateFileMetadata = (index: number, field: 'documentType' | 'notes', value: string) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], [field]: value };
      return newFiles;
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const fileData = files[i];
        
        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = { ...newFiles[i], status: 'uploading' };
          return newFiles;
        });

        // Upload file to storage
        const fileExt = fileData.file.name.split('.').pop();
        const fileName = `${patientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('patient-documents')
          .upload(fileName, fileData.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Save document metadata to database
        const { error: dbError } = await supabase
          .from('patient_documents')
          .insert({
            patient_id: patientId,
            document_name: fileData.file.name,
            file_path: uploadData.path,
            file_size: fileData.file.size,
            file_type: fileData.file.type,
            document_type: fileData.documentType,
            notes: fileData.notes || null
          });

        if (dbError) throw dbError;

        setFiles(prev => {
          const newFiles = [...prev];
          newFiles[i] = { ...newFiles[i], status: 'success', progress: 100 };
          return newFiles;
        });
      }

      toast.success(`Đã tải lên ${files.length} tài liệu thành công`);
      setFiles([]);
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Lỗi khi tải lên tài liệu');
      
      setFiles(prev => prev.map(file => 
        file.status === 'uploading' 
          ? { ...file, status: 'error' as const }
          : file
      ));
    } finally {
      setIsUploading(false);
    }
  };

  const documentTypes = [
    { value: 'general', label: 'Tài liệu chung' },
    { value: 'medical_record', label: 'Hồ sơ y tế' },
    { value: 'lab_result', label: 'Kết quả xét nghiệm' },
    { value: 'prescription', label: 'Đơn thuốc' },
    { value: 'insurance', label: 'Bảo hiểm' },
    { value: 'identification', label: 'Giấy tờ tùy thân' },
    { value: 'consent', label: 'Giấy cam kết' }
  ];

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-text-500" />
        {isDragActive ? (
          <p className="text-primary">Thả tài liệu vào đây...</p>
        ) : (
          <div>
            <p className="text-text-700 mb-1">Kéo thả tài liệu hoặc click để chọn</p>
            <p className="text-sm text-text-500">
              Hỗ trợ: PDF, Word, hình ảnh (tối đa 10MB)
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((fileData, index) => (
            <Card key={index} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-start gap-4">
                  {/* File Preview/Icon */}
                  <div className="flex-shrink-0">
                    {fileData.preview ? (
                      <img 
                        src={fileData.preview} 
                        alt="Preview" 
                        className="h-12 w-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                        {getFileIcon(fileData.file)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-text-900">{fileData.file.name}</p>
                        <p className="text-sm text-text-500">
                          {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            fileData.status === 'success' ? 'default' :
                            fileData.status === 'error' ? 'destructive' :
                            fileData.status === 'uploading' ? 'secondary' : 'outline'
                          }
                        >
                          {fileData.status === 'success' && 'Thành công'}
                          {fileData.status === 'error' && 'Lỗi'}
                          {fileData.status === 'uploading' && 'Đang tải lên'}
                          {fileData.status === 'pending' && 'Chờ tải lên'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Metadata Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select
                        value={fileData.documentType}
                        onValueChange={(value) => updateFileMetadata(index, 'documentType', value)}
                        disabled={isUploading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Loại tài liệu" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Ghi chú (tùy chọn)"
                        value={fileData.notes}
                        onChange={(e) => updateFileMetadata(index, 'notes', e.target.value)}
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setFiles([])}
            disabled={isUploading}
          >
            Hủy tất cả
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={isUploading || files.length === 0}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Đang tải lên...' : `Tải lên ${files.length} tài liệu`}
          </Button>
        </div>
      )}
    </div>
  );
}