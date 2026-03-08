import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '../ThemeContext';
import { FileText, RotateCcw, Trash2, Clock } from 'lucide-react';

const STORAGE_KEY = 'orphanova_drafts';

export default function DraftControls() {
  const { theme } = useTheme();
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setDrafts(stored);
  }, []);

  const save = (next) => { setDrafts(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); };

  const handleDelete = (id) => save(drafts.filter(d => d.id !== id));

  return (
    <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          <FileText className="w-5 h-5" /> Draft Versions ({drafts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {drafts.length === 0 ? (
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            No saved drafts. Drafts from the paper writing stage appear here for version management.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {drafts.map((draft, i) => (
              <div key={draft.id || i} className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {draft.title || 'Untitled Draft'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{draft.format || 'arXiv'}</Badge>
                      <span className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        <Clock className="w-3 h-3" /> {new Date(draft.updated_at || draft.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(draft.id)}>
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
