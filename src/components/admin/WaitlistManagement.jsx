import React, { useState, useEffect } from 'react';
import { WaitlistEntry } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Mail, Calendar, Building } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export default function WaitlistManagement() {
  const { theme } = useTheme();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWaitlist();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [searchTerm, entries]);

  const loadWaitlist = async () => {
    try {
      const waitlist = await WaitlistEntry.list('-created_date');
      setEntries(waitlist);
      setFilteredEntries(waitlist);
    } catch (error) {
      console.error('Error loading waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    if (!searchTerm) {
      setFilteredEntries(entries);
      return;
    }

    const filtered = entries.filter(e =>
      e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.organization?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEntries(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Organization', 'Research Focus', 'Join Date'];
    const rows = filteredEntries.map(e => [
      e.full_name || '',
      e.email || '',
      e.organization || '',
      e.research_focus || '',
      new Date(e.created_date).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Loading waitlist...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`} />
              <Input
                placeholder="Search waitlist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Waitlist Entries */}
      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
            Waitlist Entries ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {entry.full_name}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        <Mail className="w-3 h-3 inline mr-1" />
                        {entry.email}
                      </p>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      Pending
                    </Badge>
                  </div>
                  {entry.organization && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      <Building className="w-3 h-3 inline mr-1" />
                      {entry.organization}
                    </p>
                  )}
                  {entry.research_focus && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Focus: {entry.research_focus}
                    </p>
                  )}
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Joined {new Date(entry.created_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}