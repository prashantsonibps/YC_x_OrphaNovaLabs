import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '../ThemeContext';

export default function FeedbackManagement() {
  const { theme } = useTheme();

  return (
    <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
      <CardHeader>
        <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Feedback Management</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
          User feedback collection and management system coming soon.
        </p>
      </CardContent>
    </Card>
  );
}