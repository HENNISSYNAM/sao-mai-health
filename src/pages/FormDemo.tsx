import React from 'react';
import { ExampleForm } from '@/components/ExampleForm';

export default function FormDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Demo Form với Zod</h1>
        <p className="text-muted-foreground">
          Ví dụ form validation với Zod, focus ring rõ ràng và thông báo lỗi ngắn gọn
        </p>
      </div>
      
      <ExampleForm />
    </div>
  );
}