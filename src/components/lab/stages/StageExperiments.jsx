import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Loader2, Star } from 'lucide-react';
import { Experiment, Hypothesis } from '@/api/entities';
import { Core } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function StageExperiments({ project, onComplete }) {
  const [generating, setGenerating] = useState(false);
  const [experiments, setExperiments] = useState([]);

  useEffect(() => {
    loadExistingExperiments();
  }, []);

  const loadExistingExperiments = async () => {
    const existing = await Experiment.filter({ project_id: project.id });
    setExperiments(existing);
  };

  const handleGenerate = async () => {
    setGenerating(true);

    await new Promise(resolve => setTimeout(resolve, 8000));

    try {
      const approvedHyps = await Hypothesis.filter({
        project_id: project.id,
        status: 'approved'
      });

      const hypContext = approvedHyps.map(h => `${h.title}: ${h.description.slice(0, 200)}...`).join('\n\n');

      const result = await Core.InvokeLLM({
        prompt: `Suggest 5-7 validation experiments for these hypotheses about ${project.disease_name}:

${hypContext}

Return JSON with experiments array. Each needs: title, description (detailed protocol), type (computational/in_vitro/in_vivo/clinical), estimated_cost, estimated_duration.`,
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
                  estimated_duration: { type: "string" }
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

      setExperiments(savedExps);
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
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
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Experiment Suggestions</h2>
          <p className="text-slate-400">
            NOVUS suggests validation experiments. Rate each on feasibility, impact, and novelty.
          </p>
        </div>

        {experiments.length === 0 && !generating && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FlaskConical className="w-8 h-8 text-cyan-400" />
              </div>
              <p className="text-slate-300 mb-6">Generate experimental validation protocols</p>
              <Button
                onClick={handleGenerate}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <FlaskConical className="w-4 h-4 mr-2" />
                Suggest Experiments
              </Button>
            </CardContent>
          </Card>
        )}

        {generating && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <div className="text-center">
                  <p className="text-white font-medium mb-2">Designing Experiments...</p>
                  <div className="space-y-1 text-sm text-slate-400">
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                      → Analyzing approved hypotheses...
                    </motion.p>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}>
                      → Designing validation protocols...
                    </motion.p>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 5 }}>
                      → Estimating resources...
                    </motion.p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {experiments.length > 0 && (
          <>
            <div className="grid gap-6">
              {experiments.map((exp) => (
                <motion.div key={exp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-xl font-bold text-white flex-1">{exp.title}</h3>
                        <Badge className={getTypeColor(exp.type)}>
                          {exp.type.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap">
                        {exp.description}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-slate-900/50 rounded">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Estimated Cost</p>
                          <p className="text-white font-medium">{exp.estimated_cost}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Estimated Duration</p>
                          <p className="text-white font-medium">{exp.estimated_duration}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
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
                                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                  }`}
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {experiments.length > 0 && (
          <div className="flex justify-end pt-6 border-t border-slate-700">
            <Button
              onClick={onComplete}
              disabled={!allRated}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {allRated ? 'Continue to Review' : 'Rate All Experiments to Continue'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}