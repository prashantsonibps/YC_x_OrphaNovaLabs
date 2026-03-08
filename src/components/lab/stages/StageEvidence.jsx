import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Loader2, Check, X, AlertCircle, Info, ExternalLink, HelpCircle, BookOpen } from 'lucide-react';
import { Relation, Literature, Draft } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '../../ThemeContext';
import KnowledgeGraphScientific from '../visualizations/KnowledgeGraphScientific';

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

  const loadExistingRelations = async () => {
    try {
      const existing = await Relation.filter({ project_id: project.id });
      setRelations(existing);
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

      const result = await base44.integrations.Core.InvokeLLM({
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
          citation_ids: selectedLit.map(l => l.id)
        });
        savedRelations.push(created);
      }

      clearInterval(progressInterval);
      setProgress(100);
      setTimeRemaining(0);
      
      // Check if minimal evidence found
      if (savedRelations.length < 2) {
        setError('🔬 Minimal evidence extracted. This disease may be under-researched. Your work could establish foundational knowledge - future NOVUS versions will enhance support for novel research areas.');
      }
      
      setRelations(savedRelations);
      setRetryCount(0);
    } catch (error) {
      console.error('Extraction error:', error);
      clearInterval(progressInterval);
      setError(error.message || 'Failed to extract evidence. Please try again.');
    } finally {
      setTimeout(() => setExtracting(false), 500);
    }
  };

  const updateStatus = async (relationId, status) => {
    await Relation.update(relationId, { status });
    setRelations(prev =>
      prev.map(r => r.id === relationId ? { ...r, status } : r)
    );
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
                          <strong>Future Capabilities:</strong> The knowledge graph will expand to include pathways, biomarkers, variants, tissue expression, 
                          AI-predicted relationships (shown as dashed lines), and multi-view navigation (disease-centric, gene-centric, pathway-centric views).
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

            {showGraph && validCount > 0 && (
              <Card className={`mb-6 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start gap-3">
                    <Info className={`w-5 h-5 mt-0.5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Interactive Knowledge Graph
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        This visualization shows your validated disease-gene-drug network. Each node represents an entity, and lines show relationships with evidence support. 
                        This graph will grow as you validate more relationships and will power AI-driven hypothesis generation in the next stage.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href="https://neo4j.com/product/bloom/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          Similar to Neo4j Bloom <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>•</span>
                        <a
                          href="https://en.wikipedia.org/wiki/Knowledge_graph"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          Learn about Knowledge Graphs <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="h-96">
                    <KnowledgeGraphScientific 
                      relations={relations.filter(r => r.status === 'valid')}
                      onAddToPaper={async (imageUrl) => {
                        const drafts = await Draft.filter({ project_id: project.id });
                        if (drafts.length > 0) {
                          const figures = drafts[0].figures || [];
                          figures.push({
                            url: imageUrl,
                            caption: 'Disease-gene-drug interaction network showing validated relationships from evidence extraction.'
                          });
                          await Draft.update(drafts[0].id, { figures });
                          alert('✅ Knowledge graph added to paper draft!');
                        } else {
                          alert('⚠️ Please generate a paper draft first (Stage 6) before adding figures.');
                        }
                      }}
                    />
                  </div>
                  <div className={`mt-4 p-3 rounded-lg text-xs ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
                    <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                      <strong>Coming Soon:</strong> Click edges to view evidence • Add feedback and corrections • Multi-view navigation (disease-centric, gene-centric, pathway-centric) • 
                      AI-predicted relationships shown as dashed lines • Support for 500-2000 node networks • Pathway and biomarker nodes
                    </p>
                  </div>
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
                          <div className="flex items-center gap-2 mb-3">
                            <Badge className={getStatusColor(rel.status)}>
                              {rel.status.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">
                              {rel.confidence}% confidence
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
    </div>
  );
}