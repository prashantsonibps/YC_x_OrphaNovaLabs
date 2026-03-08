import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '../ThemeContext';

export default function DraftControls() {
  const { theme } = useTheme();

  return (
    <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
      <CardHeader>
        <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Draft Controls</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
          Draft versioning and error management features coming soon.
        </p>
      </CardContent>
    </Card>
  );
}