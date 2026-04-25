import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Trash2, File, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PatientDocument {
  id: string;
  document_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  document_type: string;
  notes?: string;
  uploaded_at: string;
  uploaded_by?: string;
}

interface PatientDocumentsListProps {
  patientId: string;
  refreshTrigger?: number;
}

export function PatientDocumentsList({ patientId, refreshTrigger }: PatientDocumentsListProps) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Lỗi khi tải danh sách tài liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [patientId, refreshTrigger]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getDocumentTypeLabel = (type: string) => {
    const types = {
      general: 'Tài liệu chung',
      medical_record: 'Hồ sơ y tế',
      lab_result: 'Kết quả xét nghiệm',
      prescription: 'Đơn thuốc',
      insurance: 'Bảo hiểm',
      identification: 'Giấy tờ tùy thân',
      consent: 'Giấy cam kết'
    };
    return types[type as keyof typeof types] || type;
  };

  const downloadFile = async (document: PatientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.document_name;
      window.document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Lỗi khi tải xuống tài liệu');
    }
  };

  const viewFile = async (document: PatientDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .createSignedUrl(document.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('View error:', error);
      toast.error('Lỗi khi xem tài liệu');
    }
  };

  const deleteDocument = async (document: PatientDocument) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('patient-documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('patient_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(doc => doc.id !== document.id));
      toast.success('Đã xóa tài liệu thành công');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Lỗi khi xóa tài liệu');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tài liệu bệnh nhân</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-text-500 mt-2">Đang tải...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tài liệu bệnh nhân</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-text-300 mx-auto mb-4" />
            <p className="text-text-500">Chưa có tài liệu nào được tải lên</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tài liệu bệnh nhân ({documents.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-muted rounded-lg">
                  {getFileIcon(document.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-900 truncate">
                    {document.document_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getDocumentTypeLabel(document.document_type)}
                    </Badge>
                    <span className="text-xs text-text-500">
                      {formatFileSize(document.file_size)}
                    </span>
                    <span className="text-xs text-text-500">
                      {new Date(document.uploaded_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  {document.notes && (
                    <p className="text-xs text-text-500 mt-1 truncate">
                      {document.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => viewFile(document)}
                  title="Xem tài liệu"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => downloadFile(document)}
                  title="Tải xuống"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Xóa tài liệu"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                      <AlertDialogDescription>
                        Bạn có chắc chắn muốn xóa tài liệu "{document.document_name}"? 
                        Hành động này không thể hoàn tác.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteDocument(document)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}