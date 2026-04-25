import React from 'react';
import { Separator } from '@/components/ui/separator';

interface Props { title: string; children: React.ReactNode }

export const LegalSection: React.FC<Props> = ({ title, children }) => (
  <div>
    <h3 className="font-semibold text-foreground text-base mb-2">{title}</h3>
    <div className="text-muted-foreground text-sm leading-relaxed">{children}</div>
    <Separator className="mt-4" />
  </div>
);
