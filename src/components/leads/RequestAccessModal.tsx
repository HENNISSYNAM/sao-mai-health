import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  full_name: z.string().trim().min(1, 'Required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  city: z.string().max(100).optional(),
  use_case: z.string().optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RequestAccessModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ full_name: '', email: '', city: '', use_case: '', join_beta: false });

  const set = (key: string, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = async () => {
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('leads' as any).insert({
      lead_type: 'individual',
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      city: form.city.trim() || null,
      use_case: form.use_case || null,
      join_beta: form.join_beta,
    } as any);
    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        toast({ title: t('leads.duplicateTitle', 'Already registered'), description: t('leads.duplicateAccessDesc', 'This email has already requested early access.'), variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }

    setSuccess(true);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSuccess(false);
      setForm({ full_name: '', email: '', city: '', use_case: '', join_beta: false });
      setErrors({});
    }, 300);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-xl">{t('leads.accessSuccess', "You're on the list!")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('leads.accessSuccessDesc', "We'll notify you when early access is available.")}
            </DialogDescription>
            <Button onClick={handleClose} className="rounded-xl mt-2">{t('common.close', 'Close')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{t('leads.requestAccess', 'Request Early Access')}</DialogTitle>
              <DialogDescription className="text-xs">{t('leads.requestAccessDesc', 'Be among the first to experience Bio-Shield AI')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 pt-2">
          <Field label={t('leads.fullName', 'Full Name')} required error={errors.full_name}>
            <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nguyen Van A" className="rounded-xl" />
          </Field>

          <Field label={t('leads.email', 'Email')} required error={errors.email}>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" className="rounded-xl" />
          </Field>

          <Field label={t('leads.cityCountry', 'City / Country')} error={errors.city}>
            <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Ho Chi Minh City, Vietnam" className="rounded-xl" />
          </Field>

          <Field label={t('leads.intendedUse', 'Intended Use')} error={errors.use_case}>
            <Select value={form.use_case} onValueChange={v => set('use_case', v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('leads.select', 'Select...')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal_health">{t('leads.personalHealth', 'Personal Health Monitoring')}</SelectItem>
                <SelectItem value="family_care">{t('leads.familyCare', 'Family Care')}</SelectItem>
                <SelectItem value="chronic_management">{t('leads.chronicManagement', 'Chronic Condition Management')}</SelectItem>
                <SelectItem value="fitness">{t('leads.fitness', 'Fitness & Prevention')}</SelectItem>
                <SelectItem value="other">{t('leads.other', 'Other')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <Checkbox id="join_beta" checked={form.join_beta} onCheckedChange={v => set('join_beta', !!v)} />
            <Label htmlFor="join_beta" className="text-sm cursor-pointer">
              {t('leads.joinBeta', 'Join the Beta program for exclusive early features')}
            </Label>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold mt-1">
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
            {t('leads.requestAccessBtn', 'Request Access')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Field: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({ label, required, error, children }) => (
  <div className="space-y-1.5">
    <Label className={`text-sm font-medium ${required ? "after:content-['*'] after:ml-0.5 after:text-destructive" : ''} ${error ? 'text-destructive' : ''}`}>{label}</Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);
