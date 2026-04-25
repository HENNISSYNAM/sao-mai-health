import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookDemoModal } from './BookDemoModal';
import { RequestAccessModal } from './RequestAccessModal';

export const LeadCaptureButtons: React.FC = () => {
  const { t } = useTranslation();
  const [demoOpen, setDemoOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/5 hidden sm:flex"
        onClick={() => setAccessOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        {t('leads.earlyAccess', 'Early Access')}
      </Button>

      <Button
        size="sm"
        className="gap-2 rounded-xl"
        onClick={() => setDemoOpen(true)}
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">{t('leads.bookDemo', 'Book a Demo')}</span>
        <span className="sm:hidden">{t('leads.demo', 'Demo')}</span>
      </Button>

      <BookDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      <RequestAccessModal open={accessOpen} onOpenChange={setAccessOpen} />
    </>
  );
};
