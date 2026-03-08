import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Loader2, Edit2, Check, X, Paperclip } from 'lucide-react';
import { Hypothesis, Relation } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '../../ThemeContext';
import { Core } from '@/api/integrationsClient';
import NotesPanel from '../NotesPanel';

const PUBCHEM_API = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

async function fetchPubChemData(drugName) {
  if (!drugName || drugName === 'N/A' || drugName === 'unknown drug') return null;
  try {
    const res = await fetch(
      `${PUBCHEM_API}/compound/name/${encodeURIComponent(drugName)}/JSON`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const compound = data?.PC_Compounds?.[0];
    if (!compound) return null;

    const cid = compound.id?.id?.cid;
    const props = compound.props || [];
    const getProp = (label) => props.find(p => p.urn?.label === label)?.value?.sval || '';
    const getNumProp = (label) => props.find(p => p.urn?.label === label)?.value?.fval || null;

    const mf = getProp('Molecular Formula');
    const mw = getNumProp('Molecular Weight');
    const iupac = getProp('IUPAC Name');

    let description = '';
    if (cid) {
      try {
        const descRes = await fetch(
          `${PUBCHEM_API}/compound/cid/${cid}/description/JSON`
        );
        if (descRes.ok) {
          const descData = await descRes.json();
          const info = descData?.InformationList?.Information || [];
          description = info.find(i => i.Description && i.Description.length > 20)?.Description || '';
        }
      } catch {}
    }

    return {
      cid,
      molecular_formula: mf,
      molecular_weight: mw,
      iupac_name: iupac?.slice(0, 150),
      description: description.slice(0, 400),
    };
  } catch (err) {
    console.warn('PubChem lookup failed for', drugName, err);
    return null;
  }
}

export default function StageHypothesis({ project, onComplete }) {
  const { theme } = useTheme();
  const [generating, setGenerating] = useState(false);
  const [hypotheses, setHypotheses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    loadExistingHypotheses();
  }, []);

  const loadExistingHypotheses = async () => {
    try {
      const existing = await Hypothesis.filter({ project_id: project.id });
      setHypotheses(existing);
    } catch (error) {
      console.error('Error loading hypotheses:', error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 5;
      });
    }, 500);

    try {
      const validRelations = await Relation.filter({
        project_id: project.id,
        status: 'valid'
      });

      const relContext = validRelations.map(r =>
        `${r.disease} - ${r.gene || 'unknown gene'} - ${r.drug || 'unknown drug'}: ${r.relationship_type}`
      ).join('\n');

      const uniqueDrugs = [...new Set(validRelations.map(r => r.drug).filter(d => d && d !== 'N/A' && d !== 'unknown drug'))];
      const pubchemResults = await Promise.allSettled(uniqueDrugs.map(d => fetchPubChemData(d)));
      const pubchemContext = uniqueDrugs.map((drug, i) => {
        const result = pubchemResults[i];
        if (result.status !== 'fulfilled' || !result.value) return null;
        const d = result.value;
        let line = `- ${drug}`;
        if (d.molecular_formula) line += ` | Formula: ${d.molecular_formula}`;
        if (d.molecular_weight) line += ` | MW: ${d.molecular_weight}`;
        if (d.description) line += ` | ${d.description}`;
        return line;
      }).filter(Boolean).join('\n');

      const pubchemSection = pubchemContext
        ? `\n\nReal compound data from PubChem:\n${pubchemContext}`
        : '';

      const result = await Core.InvokeLLM({
        prompt: `Generate 4-6 novel research hypotheses for ${project.disease_name} based on these validated relationships:

${relContext}

Context: ${project.ai_context_summary}${pubchemSection}

Use the compound data to ground hypotheses in real pharmacological properties. Return JSON with hypotheses array. Each hypothesis needs: title, description (200 words), confidence (0-100), and key_relations (array of gene/drug names mentioned).`,
        response_json_schema: {
          type: "object",
          properties: {
            hypotheses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "number" },
                  key_relations: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      const savedHyps = [];
      for (const hyp of result.hypotheses) {
        const created = await Hypothesis.create({
          project_id: project.id,
          title: hyp.title,
          description: hyp.description,
          confidence: hyp.confidence,
          supporting_relations: validRelations.map(r => r.id).slice(0, 3),
          citations: [],
          status: 'generated'
        });
        savedHyps.push(created);
      }

      clearInterval(progressInterval);
      setProgress(100);
      
      if (savedHyps.length < 3) {
        setError('Limited hypotheses generated due to sparse evidence. Try extracting and validating more relationships in the Evidence stage to improve hypothesis generation.');
      }
      
      setHypotheses(savedHyps);
      setRetryCount(0);
    } catch (error) {
      console.error('Generation error:', error);
      setError(error.message || 'Failed to generate hypotheses. Please try again.');
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => setGenerating(false), 500);
    }
  };

  const startEdit = (hyp) => {
    setEditing(hyp.id);
    setEditText(hyp.edited_description || hyp.description);
  };

  const saveEdit = async (hypId) => {
    await Hypothesis.update(hypId, {
      edited_description: editText,
      status: 'edited'
    });
    setHypotheses(prev =>
      prev.map(h => h.id === hypId ? { ...h, edited_description: editText, status: 'edited' } : h)
    );
    setEditing(null);
  };

  const approveHypothesis = async (hypId) => {
    await Hypothesis.update(hypId, { status: 'approved' });
    setHypotheses(prev =>
      prev.map(h => h.id === hypId ? { ...h, status: 'approved' } : h)
    );
  };

  const rejectHypothesis = async (hypId) => {
    await Hypothesis.update(hypId, { status: 'rejected' });
    setHypotheses(prev =>
      prev.map(h => h.id === hypId ? { ...h, status: 'rejected' } : h)
    );
  };

  const approvedCount = hypotheses.filter(h => h.status === 'approved').length;

  return (
    <>
      <div className="h-full overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Hypothesis Generation
          </h2>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            NOVUS generates research hypotheses based on validated evidence. Review and refine each hypothesis.
          </p>
        </div>

        {hypotheses.length === 0 && !generating && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-8 h-8 text-cyan-400" />
              </div>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Generate novel research hypotheses from validated evidence
              </p>
              {error && (
                <div className={`rounded-lg p-4 mb-4 max-w-md mx-auto ${
                  error.startsWith('💡') 
                    ? 'bg-amber-500/20 border border-amber-500/30' 
                    : 'bg-red-500/20 border border-red-500/30'
                }`}>
                  <p className={`text-sm mb-2 ${
                    error.startsWith('💡') ? 'text-amber-300' : 'text-red-300'
                  }`}>{error}</p>
                  {retryCount < 3 && !error.startsWith('💡') && (
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
                <Lightbulb className="w-4 h-4 mr-2" />
                Generate Hypotheses
              </Button>
            </CardContent>
          </Card>
        )}

        {generating && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <div className="text-center">
                  <p className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Generating Hypotheses...
                  </p>
                  <div className={`space-y-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                      → Analyzing validated relationships...
                    </motion.p>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>
                      → Fetching compound data from PubChem...
                    </motion.p>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4 }}>
                      → Finding knowledge gaps...
                    </motion.p>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 6 }}>
                      → Generating novel hypotheses...
                    </motion.p>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 8 }}>
                      → Computing confidence scores...
                    </motion.p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hypotheses.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                {hypotheses.length} hypotheses generated • {approvedCount} approved
              </p>
            </div>

            <div className="grid gap-6">
              {hypotheses.map((hyp) => (
                <motion.div key={hyp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={`${
                    theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                  } ${hyp.status === 'rejected' ? 'opacity-50' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className={`text-xl font-bold flex-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {hyp.title}
                        </h3>
                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                          {hyp.confidence}% confidence
                        </Badge>
                      </div>

                      {editing === hyp.id ? (
                        <div className="mb-4">
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className={`min-h-[200px] ${
                              theme === 'dark' 
                                ? 'bg-slate-900 border-slate-700 text-white' 
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                          <div className="flex gap-2 mt-3">
                            <Button onClick={() => saveEdit(hyp.id)} size="sm" className="bg-green-600">
                              <Check className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button onClick={() => setEditing(null)} size="sm" variant="outline" 
                              className={theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <p className={`leading-relaxed whitespace-pre-wrap ${
                            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                          }`}>
                            {hyp.edited_description || hyp.description}
                          </p>
                          {hyp.status !== 'rejected' && (
                            <Button
                              onClick={() => startEdit(hyp)}
                              size="sm"
                              variant="ghost"
                              className="mt-3 text-cyan-400"
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      )}

                      {hyp.status !== 'rejected' && editing !== hyp.id && (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => approveHypothesis(hyp.id)}
                            size="sm"
                            className={hyp.status === 'approved' ? 'bg-green-600' : 'bg-slate-700 hover:bg-green-600'}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            onClick={() => rejectHypothesis(hyp.id)}
                            size="sm"
                            variant="outline"
                            className="border-slate-600 hover:border-red-500 hover:text-red-300"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {hypotheses.length > 0 && (
          <div className={`flex justify-between items-center pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
            <Button
              onClick={() => setShowNotes(true)}
              variant="outline"
              className={`${
                theme === 'dark' 
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Add Notes
            </Button>
            
            <Button
              onClick={onComplete}
              disabled={approvedCount === 0}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
            >
              Continue with {approvedCount} Approved Hypothesis{approvedCount !== 1 && 'es'}
            </Button>
          </div>
        )}
      </div>
    </div>

    {showNotes && (
      <NotesPanel
        projectId={project.id}
        stageId={3}
        onClose={() => setShowNotes(false)}
      />
    )}
  </>
  );
}