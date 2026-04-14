import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Heart, AlertCircle, Loader2, Home } from 'lucide-react';
import healthLogo from '@/assets/health-logo.png';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for successful authentication (close modal promptly)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        sessionStorage.removeItem('auth_modal_dismissed');

        onClose();
      }
    });

    return () => subscription.unsubscribe();
  }, [onClose]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure we have an intended destination stored (ProtectedRoute usually sets this).
      if (!sessionStorage.getItem('auth_redirect_to')) {
        sessionStorage.setItem('auth_redirect_to', window.location.pathname);
      }

      // Always redirect back to site root to avoid Supabase allow-list issues on deep links.
      const redirectUrl = window.location.origin;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || t('auth.errors.googleFailed', 'Đăng nhập Google thất bại'));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-md border-border/50 shadow-2xl bg-background/95 backdrop-blur-sm p-0 gap-0"
        // Hide the default close button since we have a custom one
        onInteractOutside={(e) => {
          // Allow closing by clicking outside
          onClose();
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Đăng nhập</DialogTitle>
        </VisuallyHidden>

        <div className="p-6 pt-4">
          <div className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <img src={healthLogo} alt="Health Hub" className="h-16 w-16 object-contain" />
                <Heart className="absolute -bottom-1 -right-1 h-6 w-6 text-primary animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Health Hub
            </h2>
            <p className="text-muted-foreground mt-1.5">
              {t('auth.subtitle', 'Hệ thống cảnh báo sức khỏe thông minh')}
            </p>
          </div>

          <div className="space-y-6">
            {error && (
              <Alert variant="destructive" className="animate-in fade-in-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base font-medium border-2 hover:bg-accent transition-all duration-200"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
              {t('auth.continueWithGoogle', 'Tiếp tục với Google')}
            </Button>

            {/* Home button - visible when on protected routes */}
            <Button
              variant="ghost"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                onClose();
                navigate('/');
              }}
            >
              <Home className="h-4 w-4" />
              {t('auth.goHome', 'Về trang chủ')}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t('auth.terms', 'Bằng việc đăng nhập, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật của chúng tôi.')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
