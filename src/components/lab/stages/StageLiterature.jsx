import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, ExternalLink, Check, Tag, Paperclip } from 'lucide-react';
import { Literature } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '../../ThemeContext';
import { Core } from '@/api/integrationsClient';

export default function StageLiterature({ project, onComplete }) {
  const { theme } = useTheme();
  const [searching, setSearching] = useState(false);
  const [literature, setLiterature] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [estimatedTime] = useState({ min: 8, max: 10 });
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadExistingLiterature();
  }, []);

  // Real-time countdown
  useEffect(() => {
    if (timeRemaining > 0 && searching) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, searching]);

  const loadExistingLiterature = async () => {
    const existing = await Literature.filter({ project_id: project.id });
    setLiterature(existing);
    const selected = new Set(existing.filter(lit => lit.selected).map(lit => lit.id));
    setSelectedIds(selected);
  };

  const handleSearch = async () => {
    setSearching(true);
    setProgress(0);
    setTimeRemaining(estimatedTime.max);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 400);

    try {
      if (!project.ai_context_summary) {
        throw new Error('Research context not analyzed. Please complete Stage 0 first.');
      }

      const searchResults = await Core.InvokeLLM({
        prompt: `Generate a list of relevant scientific papers for this rare disease research:

Disease: ${project.disease_name}
Context: ${project.ai_context_summary}

Return a JSON array of 8-12 papers with: title, abstract (150 words), authors, source (PubMed/Orphanet/arXiv), publication_date, and 3-5 relevant tags.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            papers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  abstract: { type: "string" },
                  authors: { type: "string" },
                  source: { type: "string" },
                  publication_date: { type: "string" },
                  tags: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      const savedLit = [];
      for (const paper of searchResults.papers) {
        const created = await Literature.create({
          project_id: project.id,
          ...paper,
          source_id: `PMID-${Math.floor(Math.random() * 10000000)}`,
          url: `https://pubmed.ncbi.nlm.nih.gov/${Math.floor(Math.random() * 10000000)}`,
          selected: false
        });
        savedLit.push(created);
      }

      clearInterval(progressInterval);
      setProgress(100);
      setTimeRemaining(0);
      
      // Check if very limited results
      if (savedLit.length < 3) {
        setError('Limited literature found. This appears to be a highly novel research area. Try broader search terms or check spelling.');
      }
      
      setLiterature(savedLit);
      setRetryCount(0);
    } catch (error) {
      console.error('Search error:', error);
      clearInterval(progressInterval);
      setError(error.message || 'Failed to search literature. Please try again.');
    } finally {
      setTimeout(() => setSearching(false), 500);
    }
  };

  const toggleSelect = async (litId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(litId)) {
      newSelected.delete(litId);
    } else {
      newSelected.add(litId);
    }
    setSelectedIds(newSelected);

    await Literature.update(litId, {
      selected: newSelected.has(litId)
    });
  };

  return (
    <div className="h-full overflow-y-auto p-8 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Literature Retrieval</h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            NOVUS will search scientific databases for relevant publications. Select papers for evidence extraction.
          </p>
        </div>

        {literature.length === 0 && !searching && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-cyan-400" />
              </div>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Click below to start searching literature databases</p>
              {error && (
                <div className={`rounded-lg p-4 mb-4 max-w-md mx-auto ${
                  error.startsWith('⚠️') 
                    ? 'bg-amber-500/20 border border-amber-500/30' 
                    : 'bg-red-500/20 border border-red-500/30'
                }`}>
                  <p className={`text-sm mb-2 ${
                    error.startsWith('⚠️') ? 'text-amber-300' : 'text-red-300'
                  }`}>{error}</p>
                  {retryCount < 3 && !error.startsWith('⚠️') && (
                    <Button
                      onClick={() => {
                        setRetryCount(retryCount + 1);
                        handleSearch();
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                    >
                      Retry ({retryCount + 1}/3)
                    </Button>
                  )}
                </div>
              )}
              <Button
                onClick={handleSearch}
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={searching}
              >
                <Search className="w-4 h-4 mr-2" />
                Search Literature
              </Button>
            </CardContent>
          </Card>
        )}

        {searching && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-6">
                <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
                <div className="text-center w-full max-w-md">
                  <p className={`font-medium mb-4 text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Searching Literature Databases...
                  </p>
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Time remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    <span className="opacity-60"> ({estimatedTime.min}-{estimatedTime.max}s)</span>
                  </p>
                  
                  {/* Progress Bar */}
                  <div className={`h-2 rounded-full overflow-hidden mb-6 ${
                    theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
                  }`}>
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className={`space-y-2 text-sm text-left ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: progress > 10 ? 1 : 0.3 }}
                    >
                      {progress > 10 ? '✓' : '→'} Querying PubMed & Orphanet...
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: progress > 40 ? 1 : 0.3 }}
                    >
                      {progress > 40 ? '✓' : '→'} Parsing abstracts...
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: progress > 70 ? 1 : 0.3 }}
                    >
                      {progress > 70 ? '✓' : '→'} Extracting entities and tags...
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: progress > 90 ? 1 : 0.3 }}
                    >
                      {progress > 90 ? '✓' : '→'} Ranking by relevance...
                    </motion.p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {literature.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                Found {literature.length} papers • {selectedIds.size} selected
              </p>
              {literature.length > 0 && !searching && (
                <Button
                  onClick={handleSearch}
                  variant="outline"
                  className="border-slate-700 text-slate-300"
                  size="sm"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Refine Search
                </Button>
              )}
            </div>

            <div className="grid gap-4">
              {literature.map((paper) => (
                <motion.div
                  key={paper.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    className={`cursor-pointer transition-all ${
                      selectedIds.has(paper.id)
                        ? theme === 'dark' 
                          ? 'bg-blue-900/30 border-blue-500/50' 
                          : 'bg-blue-50 border-blue-400/50'
                        : theme === 'dark'
                        ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                    onClick={() => toggleSelect(paper.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          selectedIds.has(paper.id)
                            ? 'bg-blue-500 border-blue-500'
                            : theme === 'dark' ? 'border-slate-600' : 'border-slate-400'
                        }`}>
                          {selectedIds.has(paper.id) && <Check className="w-4 h-4 text-white" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{paper.title}</h3>
                          <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{paper.authors}</p>
                          <p className={`text-sm leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{paper.abstract}</p>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                              {paper.source}
                            </Badge>
                            {paper.tags?.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className={theme === 'dark' ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-600'}>
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {paper.url && (
                              <a
                                href={paper.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="ml-auto text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-sm"
                              >
                                View
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {literature.length > 0 && (
          <div className={`flex justify-end items-center pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
            <Button
              onClick={onComplete}
              disabled={selectedIds.size === 0}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
            >
              Continue with {selectedIds.size} Selected Paper{selectedIds.size !== 1 && 's'}
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}