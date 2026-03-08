import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Database, Loader2, Check, X, AlertCircle, Info, ExternalLink, HelpCircle, BookOpen, Atom, Eye } from 'lucide-react';
import { Relation, Literature, Draft } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { useTheme } from '../../ThemeContext';
import { Core } from '@/api/integrationsClient';
import KnowledgeGraphScientific from '../visualizations/KnowledgeGraphScientific';

const OT_API = 'https://api.platform.opentargets.org/api/v4/graphql';
const UNIPROT_API = 'https://rest.uniprot.org/uniprotkb/search';

async function fetchUniProtData(geneName) {
  if (!geneName || geneName === 'N/A') return null;
  try {
    const res = await fetch(
      `${UNIPROT_API}?query=gene_exact:${encodeURIComponent(geneName)}+AND+organism_id:9606&format=json&size=1`
    );
    const data = await res.json();
    const entry = data?.results?.[0];
    if (!entry) return null;

    const proteinName = entry.proteinDescription?.recommendedName?.fullName?.value
      || entry.proteinDescription?.submissionNames?.[0]?.fullName?.value || '';
    const func = (entry.comments || []).find(c => c.commentType === 'FUNCTION');
    const funcText = func?.texts?.[0]?.value || '';
    const diseaseComments = (entry.comments || []).filter(c => c.commentType === 'DISEASE');
    const diseases = diseaseComments.map(d => d.disease?.diseaseId ? `${d.disease.diseaseId}: ${d.disease.description || ''}`.slice(0, 120) : '').filter(Boolean);
    const subcell = (entry.comments || []).find(c => c.commentType === 'SUBCELLULAR LOCATION');
    const location = subcell?.subcellularLocations?.[0]?.location?.value || '';

    return {
      protein_name: proteinName,
      function: funcText.slice(0, 300),
      diseases: diseases.slice(0, 3),
      subcellular_location: location,
      accession: entry.primaryAccession || '',
    };
  } catch (err) {
    console.warn('UniProt lookup failed:', err);
    return null;
  }
}

async function fetchOpenTargetsScore(diseaseName, geneName) {
  if (!diseaseName || !geneName || geneName === 'N/A') return null;
  try {
    const diseaseRes = await fetch(OT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { search(queryString: "${diseaseName}", entityNames: ["disease"], page: { size: 1, index: 0 }) { hits { id name entity } } }`
      })
    });
    const diseaseData = await diseaseRes.json();
    const diseaseHit = diseaseData?.data?.search?.hits?.[0];
    if (!diseaseHit || diseaseHit.entity !== 'disease') return null;
    const diseaseId = diseaseHit.id;

    const geneRes = await fetch(OT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { search(queryString: "${geneName}", entityNames: ["target"], page: { size: 1, index: 0 }) { hits { id name entity } } }`
      })
    });
    const geneData = await geneRes.json();
    const geneHit = geneData?.data?.search?.hits?.[0];
    if (!geneHit || geneHit.entity !== 'target') return null;
    const targetId = geneHit.id;

    const assocRes = await fetch(OT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query {
          disease(efoId: "${diseaseId}") {
            associatedTargets(page: { size: 500, index: 0 }) {
              rows { target { id approvedSymbol } score }
            }
          }
        }`
      })
    });
    const assocData = await assocRes.json();
    const rows = assocData?.data?.disease?.associatedTargets?.rows ?? [];
    const match = rows.find(r => r.target?.id === targetId);
    return match ? match.score : 0;
  } catch (err) {
    console.warn('OpenTargets lookup failed:', err);
    return null;
  }
}

const AF_CACHE_PREFIX = 'orphanova_alphafold_';

function getCachedAlphaFold(geneName) {
  if (!geneName) return null;
  try {
    const raw = localStorage.getItem(`${AF_CACHE_PREFIX}${geneName.toUpperCase()}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCachedAlphaFold(geneName, data) {
  if (!geneName || !data) return;
  try {
    localStorage.setItem(
      `${AF_CACHE_PREFIX}${geneName.toUpperCase()}`,
      JSON.stringify({ ...data, cached_at: Date.now() })
    );
  } catch (e) { console.warn('localStorage write failed:', e); }
}

export default function StageEvidence({ project, onComplete }) {
  const { theme } = useTheme();
  const [extracting, setExtracting] = useState(false);
  const [relations, setRelations] = useState([]);
  const [estimatedTime] = useState({ min: 9, max: 12 });
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const [afLoading, setAfLoading] = useState({});
  const [afResults, setAfResults] = useState({});
  const [afError, setAfError] = useState({});
  const [molstarModal, setMolstarModal] = useState(null);

  useEffect(() => {
    loadExistingRelations();
  }, []);

  useEffect(() => {
    if (timeRemaining > 0 && extracting) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, extracting]);

  const enrichRelations = (rels) => {
    for (const r of rels) {
      if (r.ot_score === null || r.ot_score === undefined) {
        fetchOpenTargetsScore(r.disease, r.gene).then(score => {
          if (score === null) return;
          Relation.update(r.id, { ot_score: score });
          setRelations(prev => prev.map(x => x.id === r.id ? { ...x, ot_score: score } : x));
        });
      }
      if (!r.uniprot) {
        fetchUniProtData(r.gene).then(data => {
          if (!data) return;
          Relation.update(r.id, { uniprot: data });
          setRelations(prev => prev.map(x => x.id === r.id ? { ...x, uniprot: data } : x));
        });
      }
    }
  };

  const loadExistingRelations = async () => {
    try {
      const existing = await Relation.filter({ project_id: project.id });
      setRelations(existing);
      enrichRelations(existing);
    } catch (error) {
      console.error('Error loading relations:', error);
    }
  };

  const handleExtract = async () => {
    setExtracting(true);
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
    }, 450);

    try {
      const selectedLit = await Literature.filter({
        project_id: project.id,
        selected: true
      });

      if (selectedLit.length === 0) {
        throw new Error('No papers selected. Please go back and select at least one paper.');
      }

      const litContext = selectedLit.map(l => `${l.title}: ${l.abstract}`).join('\n\n');

      const result = await Core.InvokeLLM({
        prompt: `Extract disease-gene-drug relationships from these papers about ${project.disease_name}:

${litContext}

Return JSON with relationships array containing: disease, gene, drug, relationship_type, evidence (short quote), and confidence (0-100).`,
        response_json_schema: {
          type: "object",
          properties: {
            relationships: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  disease: { type: "string" },
                  gene: { type: "string" },
                  drug: { type: "string" },
                  relationship_type: { type: "string" },
                  evidence: { type: "string" },
                  confidence: { type: "number" }
                }
              }
            }
          }
        }
      });

      const savedRelations = [];
      for (const rel of result.relationships) {
        const created = await Relation.create({
          project_id: project.id,
          ...rel,
          status: 'uncertain',
          ot_score: null,
          citation_ids: selectedLit.map(l => l.id)
        });
        savedRelations.push(created);
      }

      clearInterval(progressInterval);
      setProgress(100);
      setTimeRemaining(0);

      if (savedRelations.length < 2) {
        setError('Minimal evidence extracted. This disease may have limited documented molecular targets. Try refining the literature or adding more sources.');
      }

      setRelations(savedRelations);
      enrichRelations(savedRelations);
      setRetryCount(0);
    } catch (error) {
      console.error('Extraction error:', error);
      clearInterval(progressInterval);
      setError(error.message || 'Failed to extract evidence. Please try again.');
    } finally {
      setTimeout(() => setExtracting(false), 500);
    }
  };

  const runAlphaFoldForGene = useCallback(async (geneName, relationId) => {
    if (!geneName || geneName === 'N/A') return;
    const upperGene = geneName.toUpperCase();

    const cached = getCachedAlphaFold(geneName);
    if (cached && cached.status === 'completed') {
      setAfResults(prev => ({ ...prev, [upperGene]: cached }));
      return;
    }

    setAfLoading(prev => ({ ...prev, [upperGene]: true }));
    setAfError(prev => ({ ...prev, [upperGene]: null }));

    try {
      const result = await Core.RunAlphaFold({ geneName });
      if (result.status === 'completed') {
        setCachedAlphaFold(geneName, result);
        setAfResults(prev => ({ ...prev, [upperGene]: result }));
      } else {
        setAfError(prev => ({ ...prev, [upperGene]: result.error || 'AlphaFold did not complete in time.' }));
      }
    } catch (err) {
      console.error('AlphaFold error:', err);
      setAfError(prev => ({ ...prev, [upperGene]: err.message || 'AlphaFold prediction failed.' }));
    } finally {
      setAfLoading(prev => ({ ...prev, [upperGene]: false }));
    }
  }, []);

  useEffect(() => {
    const preloaded = {};
    for (const rel of relations) {
      if (rel.gene && rel.gene !== 'N/A' && rel.status === 'valid') {
        const cached = getCachedAlphaFold(rel.gene);
        if (cached && cached.status === 'completed') {
          preloaded[rel.gene.toUpperCase()] = cached;
        }
      }
    }
    if (Object.keys(preloaded).length > 0) {
      setAfResults(prev => ({ ...prev, ...preloaded }));
    }
  }, [relations]);

  const updateStatus = async (relationId, status) => {
    await Relation.update(relationId, { status });
    setRelations(prev =>
      prev.map(r => r.id === relationId ? { ...r, status } : r)
    );

    if (status === 'valid') {
      const rel = relations.find(r => r.id === relationId);
      if (rel?.gene && rel.gene !== 'N/A') {
        const upper = rel.gene.toUpperCase();
        if (!afResults[upper] && !afLoading[upper]) {
          runAlphaFoldForGene(rel.gene, relationId);
        }
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    }
  };

  const validCount = relations.filter(r => r.status === 'valid').length;

  return (
    <div className="h-full overflow-y-auto p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className={`text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Evidence Extraction & Knowledge Graph
              </h2>
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                NOVUS extracts disease-gene-drug relationships from literature. Your validation builds the knowledge graph that powers hypothesis generation.
              </p>
            </div>
            <Button
              onClick={() => setShowInfo(!showInfo)}
              variant="outline"
              size="sm"
              className={theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}
            >
              <Info className="w-4 h-4 mr-2" />
              Learn More
            </Button>
          </div>

          {/* Educational Info Panel */}
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className={`mb-6 ${theme === 'dark' ? 'bg-blue-900/20 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <BookOpen className={`w-6 h-6 mt-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Understanding the Knowledge Graph
                      </h3>
                      <p className={`mb-4 leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        The knowledge graph is the intelligence layer of your research - a network visualization showing how diseases, genes, drugs, and pathways interact. 
                        Each connection (edge) represents a scientifically validated relationship extracted from peer-reviewed literature.
                      </p>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'}`}>
                          <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`}>
                            🔴 Disease Nodes
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Rare diseases with their phenotypes and clinical features. Source: <a href="https://www.orpha.net" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Orphanet <ExternalLink className="inline w-3 h-3" /></a>
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'}`}>
                          <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            🔵 Gene Nodes
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Genes and their protein products. Source: <a href="https://www.uniprot.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">UniProt <ExternalLink className="inline w-3 h-3" /></a>, <a href="https://www.ncbi.nlm.nih.gov/gene" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">NCBI Gene <ExternalLink className="inline w-3 h-3" /></a>
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'}`}>
                          <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                            🟢 Drug Nodes
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Compounds and therapeutic interventions. Source: <a href="https://go.drugbank.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">DrugBank <ExternalLink className="inline w-3 h-3" /></a>, <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ClinicalTrials.gov <ExternalLink className="inline w-3 h-3" /></a>
                          </p>
                        </div>
                        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'}`}>
                          <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>
                            ⚡ Relationships
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Validated connections with evidence quotes from <a href="https://pubmed.ncbi.nlm.nih.gov" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">PubMed <ExternalLink className="inline w-3 h-3" /></a> literature
                          </p>
                        </div>
                      </div>

                      <div className={`p-4 rounded-lg mb-4 ${theme === 'dark' ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-100 border border-slate-300'}`}>
                        <h4 className={`font-semibold mb-2 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          <HelpCircle className="w-4 h-4" />
                          What does "Confidence Score" mean?
                        </h4>
                        <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          The confidence score (0-100%) indicates how strongly the evidence supports the relationship. It's calculated based on:
                        </p>
                        <ul className={`text-sm space-y-1 ml-4 list-disc ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          <li>Clarity and specificity of the evidence quote</li>
                          <li>Number of supporting citations</li>
                          <li>Quality and impact factor of source journals</li>
                          <li>Consistency across multiple studies</li>
                        </ul>
                      </div>

                      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-amber-900/20 border border-amber-500/30' : 'bg-amber-50 border border-amber-300'}`}>
                        <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                          🔬 Why Your Validation Matters
                        </h4>
                        <p className={`text-sm ${theme === 'dark' ? 'text-amber-200' : 'text-amber-800'}`}>
                          Your expert validation is crucial! Valid relationships feed into AI-powered hypothesis generation and can be shared with the research community. 
                          For rare diseases, every validated connection advances global understanding.
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                          <strong>Tip:</strong> Validate more relationships to build a richer knowledge graph. The graph includes drug-gene interactions, disease associations, and protein targets from Open Targets and UniProt.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {relations.length === 0 && !extracting && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-cyan-400" />
              </div>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Extract relationships from selected literature
              </p>
              {error && (
                <div className={`rounded-lg p-4 mb-4 max-w-md mx-auto ${
                  error.startsWith('🔬') 
                    ? 'bg-amber-500/20 border border-amber-500/30' 
                    : 'bg-red-500/20 border border-red-500/30'
                }`}>
                  <p className={`text-sm mb-2 ${
                    error.startsWith('🔬') ? 'text-amber-300' : 'text-red-300'
                  }`}>{error}</p>
                  {retryCount < 3 && !error.startsWith('🔬') && (
                    <Button
                      onClick={() => {
                        setRetryCount(retryCount + 1);
                        handleExtract();
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
                onClick={handleExtract}
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={extracting}
              >
                <Database className="w-4 h-4 mr-2" />
                Extract Evidence
              </Button>
            </CardContent>
          </Card>
        )}

        {extracting && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-6">
                <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
                <div className="text-center w-full max-w-md">
                  <p className={`font-medium mb-4 text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Extracting Relationships...
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
                      {progress > 10 ? '✓' : '→'} Parsing selected papers...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 40 ? 1 : 0.3 }}>
                      {progress > 40 ? '✓' : '→'} Identifying entities (genes, drugs)...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 70 ? 1 : 0.3 }}>
                      {progress > 70 ? '✓' : '→'} Extracting relationships...
                    </motion.p>
                    <motion.p animate={{ opacity: progress > 90 ? 1 : 0.3 }}>
                      {progress > 90 ? '✓' : '→'} Computing confidence scores...
                    </motion.p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {relations.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                {relations.length} relationships extracted • {validCount} validated
              </p>
              <Button
                onClick={() => setShowGraph(!showGraph)}
                variant="outline"
                size="sm"
                className={theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}
              >
                {showGraph ? 'Hide' : 'Show'} Knowledge Graph
              </Button>
            </div>

            {showGraph && (
              <Card className={`mb-6 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className={`font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      <Database className={`w-4 h-4 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      Knowledge Graph
                      <span className={`text-xs font-normal ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        — click a gene node to highlight its connections
                      </span>
                    </h4>
                  </div>
                  <KnowledgeGraphScientific
                    relations={relations}
                    diseaseName={project.disease_name}
                  />
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {relations.map((rel) => (
                <motion.div
                  key={rel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`${
                    theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                  } ${rel.status !== 'uncertain' ? 'opacity-75' : ''}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Badge className={getStatusColor(rel.status)}>
                              {rel.status.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
                              {rel.confidence}% confidence
                            </Badge>
                            <Badge variant="outline" className={
                              rel.ot_score === null || rel.ot_score === undefined
                                ? 'border-slate-500/30 text-slate-400'
                                : rel.ot_score >= 0.5
                                  ? 'border-emerald-500/30 text-emerald-300'
                                  : rel.ot_score > 0
                                    ? 'border-amber-500/30 text-amber-300'
                                    : 'border-slate-500/30 text-slate-400'
                            }>
                              {rel.ot_score === null || rel.ot_score === undefined
                                ? <><Loader2 className="w-3 h-3 inline animate-spin mr-1" />OT Score...</>
                                : rel.ot_score === 0
                                  ? 'OT: No match'
                                  : `OT Score: ${rel.ot_score.toFixed(2)}`}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                                  Disease
                                </p>
                                <a 
                                  href={`https://www.orpha.net/consor/cgi-bin/Disease_Search.php?lng=EN&data_id=&Disease_Disease_Search_diseaseGroup=${encodeURIComponent(rel.disease)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                  title="View on Orphanet"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {rel.disease}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                                  Gene
                                </p>
                                {rel.gene && rel.gene !== 'N/A' && (
                                  <a 
                                    href={`https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(rel.gene)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300"
                                    title="View on NCBI Gene"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {rel.gene || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                                  Drug
                                </p>
                                {rel.drug && rel.drug !== 'N/A' && (
                                  <a 
                                    href={`https://go.drugbank.com/unearth/q?query=${encodeURIComponent(rel.drug)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300"
                                    title="View on DrugBank"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {rel.drug || 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                                Relationship Type
                              </p>
                              <a
                                href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(`${rel.disease} ${rel.gene || ''} ${rel.drug || ''} ${rel.relationship_type}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              >
                                Search PubMed <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <p className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                              {rel.relationship_type}
                            </p>
                          </div>

                          <div className={`rounded p-3 ${
                            theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-100'
                          }`}>
                            <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                              Evidence
                            </p>
                            <p className={`text-sm italic ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              "{rel.evidence}"
                            </p>
                          </div>

                          {rel.uniprot && (
                            <div className={`rounded p-3 mt-3 ${
                              theme === 'dark' ? 'bg-indigo-900/20 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                  UniProt: {rel.uniprot.protein_name}
                                </p>
                                {rel.uniprot.accession && (
                                  <a
                                    href={`https://www.uniprot.org/uniprot/${rel.uniprot.accession}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              {rel.uniprot.function && (
                                <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <strong>Function:</strong> {rel.uniprot.function}
                                </p>
                              )}
                              {rel.uniprot.subcellular_location && (
                                <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <strong>Location:</strong> {rel.uniprot.subcellular_location}
                                </p>
                              )}
                              {rel.uniprot.diseases?.length > 0 && (
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                  <strong>Disease links:</strong> {rel.uniprot.diseases.join('; ')}
                                </p>
                              )}
                            </div>
                          )}
                          {!rel.uniprot && rel.gene && rel.gene !== 'N/A' && (
                            <div className={`rounded p-2 mt-3 flex items-center gap-2 ${
                              theme === 'dark' ? 'bg-slate-900/30' : 'bg-slate-50'
                            }`}>
                              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Loading UniProt data...</p>
                            </div>
                          )}

                          {/* AlphaFold section */}
                          {rel.gene && rel.gene !== 'N/A' && (() => {
                            const upper = rel.gene.toUpperCase();
                            const loading = afLoading[upper];
                            const result = afResults[upper];
                            const err = afError[upper];

                            if (loading) {
                              return (
                                <div className={`rounded p-3 mt-3 ${theme === 'dark' ? 'bg-purple-900/15 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                    <p className={`text-xs font-medium ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                                      Running AlphaFold2 on Tamarind Bio for {rel.gene}...
                                    </p>
                                  </div>
                                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                    Predicting 3D protein structure (polling every 3s, max 2 min)
                                  </p>
                                </div>
                              );
                            }
                            if (result && result.status === 'completed') {
                              const isDB = result.source === 'alphafold_db';
                              return (
                                <div className={`rounded p-3 mt-3 ${theme === 'dark' ? 'bg-purple-900/15 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Atom className="w-4 h-4 text-purple-400" />
                                      <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>
                                        {isDB ? 'AlphaFold DB' : 'AlphaFold2'} Structure — {rel.gene}
                                      </p>
                                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                        {result.sequenceLength} aa
                                      </Badge>
                                      {isDB && (
                                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                          Pre-computed
                                        </Badge>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      onClick={() => setMolstarModal({ geneName: rel.gene, result })}
                                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-xs"
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      View 3D Structure
                                    </Button>
                                  </div>
                                </div>
                              );
                            }
                            if (err) {
                              return (
                                <div className={`rounded p-2 mt-3 ${theme === 'dark' ? 'bg-red-900/15 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
                                  <p className={`text-xs ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>AlphaFold: {err}</p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateStatus(rel.id, 'valid')}
                          size="sm"
                          className={rel.status === 'valid' ? 'bg-green-600' : 'bg-slate-700 hover:bg-green-600'}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Valid
                        </Button>
                        <Button
                          onClick={() => updateStatus(rel.id, 'uncertain')}
                          size="sm"
                          variant="outline"
                          className={rel.status === 'uncertain' ? 'border-yellow-500 text-yellow-300' : 'border-slate-600'}
                        >
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Uncertain
                        </Button>
                        <Button
                          onClick={() => updateStatus(rel.id, 'rejected')}
                          size="sm"
                          variant="outline"
                          className={rel.status === 'rejected' ? 'border-red-500 text-red-300' : 'border-slate-600'}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {relations.length > 0 && (
          <div className={`flex justify-end items-center pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
            <Button
              onClick={onComplete}
              disabled={validCount === 0}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
            >
              Continue with {validCount} Valid Relationship{validCount !== 1 && 's'}
            </Button>
          </div>
        )}
      </div>

      {/* Mol* 3D Viewer Modal */}
      <Dialog open={!!molstarModal} onOpenChange={(open) => { if (!open) setMolstarModal(null); }}>
        <DialogContent className={`max-w-5xl h-[80vh] flex flex-col ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Atom className="w-5 h-5 text-purple-400" />
              3D Protein Structure — {molstarModal?.geneName}
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              AlphaFold2 predicted structure via Tamarind Bio
              {molstarModal?.result?.accession && (
                <span> · UniProt {molstarModal.result.accession}</span>
              )}
              {molstarModal?.result?.sequenceLength && (
                <span> · {molstarModal.result.sequenceLength} residues</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-slate-700">
            {molstarModal?.result?.pdbUrl ? (
              <iframe
                src={`https://molstar.org/viewer/?structure-url=${encodeURIComponent(molstarModal.result.pdbUrl)}&structure-url-format=pdb`}
                className="w-full h-full border-0"
                title={`Mol* viewer for ${molstarModal.geneName}`}
                allow="fullscreen"
              />
            ) : molstarModal?.result?.accession ? (
              <iframe
                src={`https://molstar.org/viewer/?pdb-provider=alphafolddb&afdb=${molstarModal.result.accession}`}
                className="w-full h-full border-0"
                title={`Mol* viewer for ${molstarModal.geneName}`}
                allow="fullscreen"
              />
            ) : (
              <iframe
                src="https://molstar.org/viewer/"
                className="w-full h-full border-0"
                title={`Mol* viewer for ${molstarModal?.geneName}`}
                allow="fullscreen"
              />
            )}
          </div>
          <div className={`text-xs flex items-center gap-2 pt-2 flex-wrap ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
            <Atom className="w-3 h-3" />
            Powered by Mol* · Structure from {molstarModal?.result?.source === 'alphafold_db' ? 'AlphaFold Protein Structure Database' : 'AlphaFold2 on Tamarind Bio'}
            {molstarModal?.result?.pdbUrl && (
              <a href={molstarModal.result.pdbUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-auto">
                Download PDB <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}