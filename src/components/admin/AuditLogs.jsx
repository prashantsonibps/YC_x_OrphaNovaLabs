import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from '../ThemeContext';
import { ScrollText, RefreshCw, Download } from 'lucide-react';

const STORAGE_KEY = 'orphanova_audit_log';

export function logAction(action, details = {}) {
  const log = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  log.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    action,
    details: typeof details === 'string' ? details : JSON.stringify(details),
    timestamp: new Date().toISOString(),
    user: details.user || 'system',
  });
  if (log.length > 500) log.length = 500;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export default function AuditLogs() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState([]);

  const load = () => setLogs(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  useEffect(load, []);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const colorFor = (action) => {
    if (action.includes('delete') || action.includes('remove')) return 'text-red-400';
    if (action.includes('create') || action.includes('add')) return 'text-green-400';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-400';
    return theme === 'dark' ? 'text-slate-300' : 'text-slate-700';
  };

  return (
    <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          <ScrollText className="w-5 h-5" /> Audit Logs ({logs.length})
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={handleExport} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            No audit entries recorded. Actions across the platform are logged here automatically.
          </p>
        ) : (
          <div className="space-y-1 max-h-[28rem] overflow-y-auto font-mono text-xs">
            {logs.slice(0, 200).map(log => (
              <div key={log.id} className={`flex items-start gap-3 py-1.5 border-b ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-100'}`}>
                <span className={`shrink-0 w-36 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span className={`shrink-0 w-20 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{log.user}</span>
                <span className={`font-semibold ${colorFor(log.action)}`}>{log.action}</span>
                {log.details && log.details !== '{}' && (
                  <span className={theme === 'dark' ? 'text-slate-500 truncate' : 'text-slate-400 truncate'}>{log.details}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
