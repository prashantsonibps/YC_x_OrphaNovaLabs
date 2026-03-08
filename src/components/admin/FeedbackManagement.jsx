import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '../ThemeContext';
import { MessageSquare, Star, Trash2, Filter } from 'lucide-react';

const STORAGE_KEY = 'orphanova_feedback';

export default function FeedbackManagement() {
  const { theme } = useTheme();
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setEntries(stored);
  }, []);

  const save = (next) => { setEntries(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);

  return (
    <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          <MessageSquare className="w-5 h-5" /> Feedback ({entries.length})
        </CardTitle>
        <div className="flex gap-1">
          {['all', 'bug', 'feature', 'general'].map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'ghost'}
              className="text-xs capitalize" onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className={theme === 'dark' ? 'text-slate-500 text-sm' : 'text-slate-400 text-sm'}>
            No feedback entries yet. User feedback submitted through the app will appear here.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filtered.map((entry, i) => (
              <div key={entry.id || i} className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{entry.type || 'general'}</Badge>
                      {entry.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-400">
                          <Star className="w-3 h-3 fill-current" /> {entry.rating}/5
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{entry.message}</p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {entry.user || 'Anonymous'} · {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300"
                    onClick={() => save(entries.filter(e => e.id !== entry.id))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
