import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Calendar, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  full_name: z.string().trim().min(1, 'Required').max(100),
  organization: z.string().trim().min(1, 'Required').max(200),
  position: z.string().max(100).optional(),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().max(20).optional(),
  org_size: z.string().optional(),
  use_case: z.string().max(1000).optional(),
  preferred_time: z.string().optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BookDemoModal: React.FC<Props> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: '', organization: '', position: '', email: '',
    phone: '', org_size: '', use_case: '', preferred_time: '',
  });

  const set = (key: string, val: string) => {
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
      lead_type: 'enterprise',
      full_name: form.full_name.trim(),
      organization: form.organization.trim(),
      position: form.position.trim() || null,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      org_size: form.org_size || null,
      use_case: form.use_case.trim() || null,
      preferred_time: form.preferred_time || null,
    } as any);
    setLoading(false);

    if (error) {
      if (error.code === '23505') {
        toast({ title: t('leads.duplicateTitle', 'Already registered'), description: t('leads.duplicateDesc', 'This email has already submitted a demo request.'), variant: 'destructive' });
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
      setForm({ full_name: '', organization: '', position: '', email: '', phone: '', org_size: '', use_case: '', preferred_time: '' });
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
            <DialogTitle className="text-xl">{t('leads.demoSuccess', 'Demo Scheduled!')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('leads.demoSuccessDesc', 'Our team will contact you within 24 hours to confirm your demo time.')}
            </DialogDescription>
            <Button onClick={handleClose} className="rounded-xl mt-2">{t('common.close', 'Close')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{t('leads.bookDemo', 'Book a Demo')}</DialogTitle>
              <DialogDescription className="text-xs">{t('leads.bookDemoDesc', 'See Bio-Shield AI in action for your organization')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 pt-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('leads.fullName', 'Full Name')} required error={errors.full_name}>
              <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Dr. Nguyen Van A" className="rounded-xl" />
            </Field>
            <Field label={t('leads.organization', 'Organization')} required error={errors.organization}>
              <Input value={form.organization} onChange={e => set('organization', e.target.value)} placeholder="Hospital / Company" className="rounded-xl" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('leads.position', 'Position')} error={errors.position}>
              <Input value={form.position} onChange={e => set('position', e.target.value)} placeholder="CTO, Director..." className="rounded-xl" />
            </Field>
            <Field label={t('leads.workEmail', 'Work Email')} required error={errors.email}>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="name@org.com" className="rounded-xl" />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t('leads.phone', 'Phone')} error={errors.phone}>
              <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+84..." className="rounded-xl" />
            </Field>
            <Field label={t('leads.orgSize', 'Organization Size')} error={errors.org_size}>
              <Select value={form.org_size} onValueChange={v => set('org_size', v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('leads.select', 'Select...')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1–10</SelectItem>
                  <SelectItem value="11-50">11–50</SelectItem>
                  <SelectItem value="51-200">51–200</SelectItem>
                  <SelectItem value="201-1000">201–1,000</SelectItem>
                  <SelectItem value="1000+">1,000+</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={t('leads.useCase', 'Use Case')} error={errors.use_case}>
            <Textarea value={form.use_case} onChange={e => set('use_case', e.target.value)} placeholder={t('leads.useCasePlaceholder', 'Tell us about your needs...')} rows={3} className="rounded-xl" />
          </Field>

          <Field label={t('leads.preferredTime', 'Preferred Demo Time')} error={errors.preferred_time}>
            <Input type="datetime-local" value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)} className="rounded-xl" />
          </Field>

          <Button onClick={handleSubmit} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold mt-2">
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Building2 className="h-5 w-5 mr-2" />}
            {t('leads.scheduleDemo', 'Schedule Demo')}
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
