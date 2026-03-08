import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Activity } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export default function SystemHealth() {
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>System Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Backend API</span>
            </div>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Operational</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Database</span>
            </div>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Operational</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>AI Models</span>
            </div>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Operational</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Storage</span>
            </div>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Active</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>No errors in the last 24 hours</p>
        </CardContent>
      </Card>
    </div>
  );
}