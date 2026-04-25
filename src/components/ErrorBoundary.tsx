import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isOffline: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isOffline: !navigator.onLine };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, isOffline: !navigator.onLine };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    // Hard reload recovers from most React crashes; soft state reset alone often doesn't
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isOffline = this.state.isOffline;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {isOffline
                  ? <WifiOff className="h-12 w-12 text-muted-foreground" />
                  : <AlertTriangle className="h-12 w-12 text-destructive" />
                }
              </div>
              <CardTitle className="text-xl">
                {isOffline ? "Mất kết nối mạng" : "Ứng dụng gặp sự cố"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-muted-foreground text-sm">
                {isOffline ? (
                  <>
                    <p>Kiểm tra kết nối internet và thử lại.</p>
                    <p>Dữ liệu đã nhập sẽ được lưu offline.</p>
                  </>
                ) : (
                  <>
                    <p>Đã xảy ra lỗi không mong đợi.</p>
                    <p>Vui lòng thử lại hoặc quay về trang chủ.</p>
                  </>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-xs font-mono text-destructive break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Thử lại
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Về trang chủ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = () => setError(null);
  const captureError = (err: Error) => setError(err);

  React.useEffect(() => {
    if (error) throw error;
  }, [error]);

  return { captureError, resetError };
};
