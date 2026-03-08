import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, Loader2, Star, Play, Plus, TrendingUp, BarChart2, Activity } from 'lucide-react';
import { Experiment, Hypothesis } from '@/api/entities';
import { Core } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '../../ThemeContext';


export default function StageExperiments({ project, onComplete }) {
  const { theme } = useTheme();
  const [generating, setGenerating] = useState(false);
  const [experiments, setExperiments] = useState([]);
  const [runningExperiment, setRunningExperiment] = useState(null);
  const [experimentResults, setExperimentResults] = useState({});
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState({ min: 10, max: 15 });
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadExistingExperiments();
  }, []);

  // Real-time countdown
  useEffect(() => {
    if (timeRemaining > 0 && generating) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, generating]);

  const loadExistingExperiments = async () => {
    try {
      const existing = await Experiment.filter({ project_id: project.id });
      setExperiments(existing);
    } catch (error) {
      console.error('Error loading experiments:', error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);
    setTimeRemaining(estimatedTime.max);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 3;
      });
    }, 450);

    try {
      const approvedHyps = await Hypothesis.filter({
        project_id: project.id,
        status: 'approved'
      });

      const hypContext = approvedHyps.map(h => `${h.title}: ${h.description.slice(0, 200)}...`).join('\n\n');

      const result = await Core.InvokeLLM({
        prompt: `Design 5-7 cutting-edge validation experiments for ${project.disease_name}:

${hypContext}

For each experiment provide:
- title
- description (detailed protocol)
- type (computational/in_vitro/in_vivo/clinical)
- estimated_cost (realistic range)
- estimated_duration (weeks/months)
- expected_outcome (what results would look like)
- biomarkers (list of measurable markers)

Return as JSON with experiments array.`,
        response_json_schema: {
          type: "object",
          properties: {
            experiments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string" },
                  estimated_cost: { type: "string" },
                  estimated_duration: { type: "string" },
                  expected_outcome: { type: "string" },
                  biomarkers: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      const savedExps = [];
      for (const exp of result.experiments) {
        const created = await Experiment.create({
          project_id: project.id,
          hypothesis_id: approvedHyps[0]?.id,
          ...exp,
          feasibility_score: null,
          impact_score: null,
          novelty_score: null
        });
        savedExps.push(created);
      }

      clearInterval(progressInterval);
      setProgress(100);
      setTimeRemaining(0);
      
      if (savedExps.length < 3) {
        setError('🧪 Limited experimental designs due to novel research context. You\'re breaking new ground - document thoroughly as your methodology could become foundational. Future NOVUS updates will better support frontier research.');
      }
      
      setExperiments(savedExps);
      setRetryCount(0);
    } catch (error) {
      console.error('Generation error:', error);
      setError(error.message || 'Failed to generate experiments. Please try again.');
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => setGenerating(false), 1000);
    }
  };

  const handleRunAIExperiment = async (exp) => {
    setRunningExperiment(exp.id);
    setProgress(0);
    setTimeRemaining(20);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 4;
      });
    }, 400);

    try {
      // Simulate AI running experiment
      const result = await Core.InvokeLLM({
        prompt: `Simulate ${exp.type} experiment: "${exp.title}" for ${project.disease_name}.

Generate realistic experimental results:
- success_rate: 0-100%
- key_findings: array of 3-5 findings
- data_points: array of 10-15 numeric measurements
- statistical_significance: p-value
- visualization_data: time series data for graph
- microscopy_findings: if applicable
- molecular_markers: expression levels

Return as JSON with detailed results.`,
        response_json_schema: {
          type: "object",
          properties: {
            success_rate: { type: "number" },
            key_findings: { type: "array", items: { type: "string" } },
            data_points: { type: "array", items: { type: "number" } },
            statistical_significance: { type: "number" },
            visualization_data: {
              type: "object",
              properties: {
                labels: { type: "array", items: { type: "string" } },
                values: { type: "array", items: { type: "number" } }
              }
            },
            molecular_markers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  baseline: { type: "number" },
                  treated: { type: "number" }
                }
              }
            }
          }
        }
      });

      clearInterval(progressInterval);
      setProgress(100);
      setTimeRemaining(0);
      
      setExperimentResults(prev => ({
        ...prev,
        [exp.id]: result
      }));

      // Auto-rate based on results
      await updateScore(exp.id, 'feasibility_score', Math.floor(result.success_rate / 20));
      await updateScore(exp.id, 'impact_score', result.success_rate > 70 ? 5 : result.success_rate > 50 ? 4 : 3);
      await updateScore(exp.id, 'novelty_score', 4);

    } catch (error) {
      console.error('Experiment run error:', error);
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => setRunningExperiment(null), 500);
    }
  };

  const updateScore = async (expId, field, value) => {
    await Experiment.update(expId, { [field]: value });
    setExperiments(prev =>
      prev.map(e => e.id === expId ? { ...e, [field]: value } : e)
    );
  };

  const getTypeColor = (type) => {
    const colors = {
      computational: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      in_vitro: 'bg-green-500/20 text-green-300 border-green-500/30',
      in_vivo: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      clinical: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    };
    return colors[type] || colors.computational;
  };

  const allRated = experiments.length > 0 && experiments.every(e =>
    e.feasibility_score && e.impact_score && e.novelty_score
  );

  return (
    <div className="h-full overflow-y-auto p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Experiment Design & Validation
          </h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            NOVUS designs experiments. Run AI simulations or add your own results.
          </p>
        </div>

        {experiments.length === 0 && !generating && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FlaskConical className="w-8 h-8 text-cyan-400" />
              </div>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Generate experimental validation protocols
              </p>
              {error && (
                <div className={`rounded-lg p-4 mb-4 max-w-md mx-auto ${
                  error.startsWith('🧪') 
                    ? 'bg-amber-500/20 border border-amber-500/30' 
                    : 'bg-red-500/20 border border-red-500/30'
                }`}>
                  <p className={`text-sm mb-2 ${
                    error.startsWith('🧪') ? 'text-amber-300' : 'text-red-300'
                  }`}>{error}</p>
                  {retryCount < 3 && !error.startsWith('🧪') && (
                    <Button
                      onClick={() => {
                        setRetryCount(retryCount + 1);
                        handleGenerate();
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
                onClick={handleGenerate}
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={generating}
              >
                <FlaskConical className="w-4 h-4 mr-2" />
                Design Experiments
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress Card - Shows during generation */}
        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-6">
                    <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
                    <div className="text-center w-full max-w-md">
                      <p className={`font-medium mb-2 text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Designing Experiments...
                      </p>
                      <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        Time remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} 
                        <span className="opacity-60"> ({estimatedTime.min}-{estimatedTime.max}s)</span>
                      </p>
                      
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
                        <motion.p animate={{ opacity: progress > 10 ? 1 : 0.3 }}>
                          {progress > 10 ? '✓' : '→'} Analyzing approved hypotheses...
                        </motion.p>
                        <motion.p animate={{ opacity: progress > 35 ? 1 : 0.3 }}>
                          {progress > 35 ? '✓' : '→'} Designing validation protocols...
                        </motion.p>
                        <motion.p animate={{ opacity: progress > 60 ? 1 : 0.3 }}>
                          {progress > 60 ? '✓' : '→'} Estimating resources & timeline...
                        </motion.p>
                        <motion.p animate={{ opacity: progress > 85 ? 1 : 0.3 }}>
                          {progress > 85 ? '✓' : '→'} Identifying biomarkers...
                        </motion.p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Experiments Grid - Shows after generation completes */}
        <AnimatePresence>
          {!generating && experiments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-6"
            >
              {experiments.map((exp) => (
                <Card key={exp.id} className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {exp.title}
                          </h3>
                          <Badge className={getTypeColor(exp.type)}>
                            {exp.type?.replace('_', ' ')}
                          </Badge>
                        </div>

                        <p className={`leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {exp.description}
                        </p>
                        
                        {/* External Resources */}
                        <div className="mb-4 flex flex-wrap gap-2">
                          <a 
                            href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(project.disease_name + ' ' + exp.type)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                          >
                            📚 PubMed Research
                          </a>
                          <a 
                            href={`https://clinicaltrials.gov/search?term=${encodeURIComponent(project.disease_name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors flex items-center gap-1"
                          >
                            🔬 Clinical Trials
                          </a>
                          <a 
                            href={`https://scholar.google.com/scholar?q=${encodeURIComponent(project.disease_name + ' ' + exp.type + ' protocol')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                          >
                            🎓 Google Scholar
                          </a>
                        </div>

                        <div className={`grid grid-cols-2 gap-4 mb-4 p-4 rounded ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
                          <div>
                            <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Estimated Cost</p>
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {exp.estimated_cost}
                            </p>
                          </div>
                          <div>
                            <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Duration</p>
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {exp.estimated_duration}
                            </p>
                          </div>
                        </div>

                        {/* AI Results */}
                        {experimentResults[exp.id] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 space-y-4"
                          >
                            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <Activity className="w-5 h-5 text-green-400" />
                                <h4 className={`font-bold ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
                                  AI Simulation Results
                                </h4>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Success Rate</p>
                                  <p className="text-2xl font-bold text-green-400">
                                    {experimentResults[exp.id].success_rate}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">P-Value</p>
                                  <p className="text-2xl font-bold text-cyan-400">
                                    {experimentResults[exp.id].statistical_significance?.toFixed(4)}
                                  </p>
                                </div>
                              </div>

                              <div className="mb-4">
                                <p className="text-xs text-slate-500 mb-2">Key Findings:</p>
                                <ul className="space-y-1">
                                  {experimentResults[exp.id].key_findings?.map((finding, idx) => (
                                    <li key={idx} className={`text-sm flex items-start gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                      <span className="text-green-400">•</span>
                                      {finding}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Simple bar chart visualization */}
                              {experimentResults[exp.id].molecular_markers && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2">Molecular Expression Levels:</p>
                                  <div className="space-y-2">
                                    {experimentResults[exp.id].molecular_markers.slice(0, 5).map((marker, idx) => (
                                      <div key={idx}>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                                            {marker.name}
                                          </span>
                                          <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                                            {marker.treated}x (from {marker.baseline}x)
                                          </span>
                                        </div>
                                        <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                          <div
                                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                            style={{ width: `${Math.min(marker.treated * 10, 100)}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          {!experimentResults[exp.id] && (
                            <>
                              <Button
                                onClick={() => handleRunAIExperiment(exp)}
                                disabled={runningExperiment === exp.id}
                                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                              >
                                {runningExperiment === exp.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Running...
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Run AI Experiment
                                  </>
                                )}
                              </Button>
                              <Button variant="outline" className={theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add My Results
                              </Button>
                            </>
                          )}
                        </div>

                        {/* Rating Section */}
                        {(experimentResults[exp.id] || exp.feasibility_score) && (
                          <div className="space-y-3 mt-6 pt-6 border-t border-slate-700">
                            {['feasibility_score', 'impact_score', 'novelty_score'].map((field) => (
                              <div key={field}>
                                <label className="text-sm text-slate-400 mb-2 block capitalize">
                                  {field.replace('_', ' ')}
                                </label>
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map((score) => (
                                    <button
                                      key={score}
                                      onClick={() => updateScore(exp.id, field, score)}
                                      className={`w-10 h-10 rounded-lg transition-all ${
                                        exp[field] === score
                                          ? 'bg-cyan-500 text-white'
                                          : theme === 'dark'
                                          ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                      }`}
                                    >
                                      {score}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {experiments.length > 0 && !generating && (
          <div className={`flex justify-end pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
            <Button
              onClick={onComplete}
              disabled={!allRated}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
            >
              {allRated ? 'Continue to Paper Drafting' : 'Rate All Experiments to Continue'}
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}