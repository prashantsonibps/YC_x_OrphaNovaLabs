import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Loader2, Star, Play, Plus, TrendingUp, BarChart2,
  Activity, ExternalLink, Beaker, ShieldCheck, AlertTriangle, Atom,
  Pill, Dna, X, CheckCircle2, XCircle, Zap, ArrowUpDown
} from 'lucide-react';
import { Experiment, Hypothesis, Relation } from '@/api/entities';
import { Core } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { useTheme } from '../../ThemeContext';

const CT_API = 'https://clinicaltrials.gov/api/v2/studies';
const AF_CACHE_PREFIX = 'orphanova_alphafold_';

function getCachedAlphaFold(geneName) {
  if (!geneName) return null;
  try {
    const raw = localStorage.getItem(`${AF_CACHE_PREFIX}${geneName.toUpperCase()}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function fetchClinicalTrials(diseaseName) {
  if (!diseaseName) return [];
  try {
    const res = await fetch(
      `${CT_API}?query.cond=${encodeURIComponent(diseaseName)}&format=json&pageSize=8&sort=LastUpdatePostDate:desc`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.studies || []).map(s => {
      const proto = s.protocolSection || {};
      const id = proto.identificationModule || {};
      const status = proto.statusModule || {};
      const design = proto.designModule || {};
      const arms = proto.armsInterventionsModule || {};
      const interventions = (arms.interventions || []).map(i => i.name).filter(Boolean);
      const phases = design.phases || [];
      return {
        nctId: id.nctId || '',
        title: (id.briefTitle || '').slice(0, 120),
        status: status.overallStatus || '',
        phase: phases.join(', ') || 'N/A',
        interventions: interventions.slice(0, 3),
        enrollment: design.enrollmentInfo?.count || null,
      };
    });
  } catch (err) {
    console.warn('ClinicalTrials.gov lookup failed:', err);
    return [];
  }
}

function extractDrugAndGene(experiment, relations) {
  const title = (experiment.title || '').toLowerCase();
  const desc = (experiment.description || '').toLowerCase();
  const combined = `${title} ${desc}`;

  let bestDrug = null;
  let bestGene = null;

  for (const rel of relations) {
    if (rel.drug && rel.drug !== 'N/A' && combined.includes(rel.drug.toLowerCase())) {
      bestDrug = rel.drug;
    }
    if (rel.gene && rel.gene !== 'N/A' && combined.includes(rel.gene.toLowerCase())) {
      bestGene = rel.gene;
    }
    if (bestDrug && bestGene) break;
  }

  if (!bestDrug && relations.length > 0) {
    const drugged = relations.find(r => r.drug && r.drug !== 'N/A');
    if (drugged) bestDrug = drugged.drug;
  }
  if (!bestGene && relations.length > 0) {
    const gened = relations.find(r => r.gene && r.gene !== 'N/A');
    if (gened) bestGene = gened.gene;
  }

  return { drugName: bestDrug, geneName: bestGene };
}

function extractDrugsForExperiment(experiment, relations) {
  const text = `${experiment.title || ''} ${experiment.description || ''} ${(experiment.biomarkers || []).join(' ')}`;
  const textLower = text.toLowerCase();
  const found = new Set();

  for (const rel of relations) {
    if (rel.drug && rel.drug !== 'N/A' && textLower.includes(rel.drug.toLowerCase())) {
      found.add(rel.drug);
    }
  }

  // Match real drug name patterns: words ending in known pharmaceutical suffixes
  // or parenthetical abbreviations like EGCG, SAHA, etc.
  const pharmaPattern = /\b(\w{4,}(?:ib|ab|mab|nib|zole|pine|pam|ine|cin|cil|ole|tin|one|fen|tan|ril|pril|lol|vir|mus|zumab|ximab|nilotinib|dasatinib))\b/gi;
  const pharmaMatches = text.match(pharmaPattern) || [];

  const EXCLUDE = new Set(['determine', 'combine', 'examine', 'decline', 'medicine', 'baseline',
    'routine', 'discipline', 'outline', 'machine', 'pipeline', 'online', 'timeline', 'define',
    'imagine', 'recognize', 'characterize', 'organize', 'metabolize', 'immunize', 'optimize',
    'differentiate', 'investigate', 'demonstrate', 'concentrate', 'incorporate', 'coordinate',
    'generate', 'degenerate', 'correlate', 'integrate', 'validate', 'isolate', 'quantitate',
    'protein', 'receptor', 'biomarker', 'organoid', 'treatment', 'expression', 'activation']);

  for (const m of pharmaMatches) {
    if (!EXCLUDE.has(m.toLowerCase())) found.add(m);
  }

  // Match known abbreviations in parentheses like (EGCG), (SAHA), (CX-4945)
  const abbrPattern = /\(([A-Z][A-Z0-9-]{1,12})\)/g;
  let abbrMatch;
  while ((abbrMatch = abbrPattern.exec(text)) !== null) {
    const abbr = abbrMatch[1];
    if (!['RNA', 'DNA', 'PCR', 'PDB', 'CIF', 'MSA', 'MRI', 'CSF', 'CNS', 'HIA', 'BBB', 'MAP', 'SOD', 'PSD', 'GABA', 'CREB', 'BDNF', 'iPSC', 'iPSCs'].includes(abbr)) {
      found.add(abbr);
    }
  }

  return [...found];
}

function RiskBadge({ level }) {
  const norm = (level || '').toLowerCase();
  if (norm.includes('low') || norm.includes('no') || norm.includes('negative') || norm.includes('minimal')) {
    return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">{level}</Badge>;
  }
  if (norm.includes('high') || norm.includes('positive') || norm.includes('significant') || norm.includes('yes')) {
    return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">{level}</Badge>;
  }
  return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">{level}</Badge>;
}

function AdmetResultsPanel({ results, theme }) {
  if (!results) return null;
  const { drug, protein, admet, docking, source } = results;

  const sourceLabel = {
    tamarind_bio: 'Tamarind Bio (Real ADMET)',
    claude_with_structure: 'AI Prediction (Structure-informed)',
    claude_prediction: 'AI Prediction (Literature-based)',
  }[source] || source;

  const sourceColor = source === 'tamarind_bio'
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

  return (
    <div className="space-y-6">
      {/* Source & Compound Info */}
      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge className={sourceColor}>{sourceLabel}</Badge>
          {drug?.smiles && (
            <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-xs font-mono max-w-[200px] truncate">
              {drug.smiles}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {drug?.name && (
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Drug</p>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{drug.name}</p>
            </div>
          )}
          {drug?.molecular_formula && (
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Formula</p>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{drug.molecular_formula}</p>
            </div>
          )}
          {drug?.molecular_weight && (
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>MW</p>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{drug.molecular_weight} g/mol</p>
            </div>
          )}
          {protein?.name && (
            <div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Protein Target</p>
              <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{protein.name}</p>
            </div>
          )}
        </div>
      </div>

      {admet && (
        <>
          {/* ADMET Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Absorption */}
            {admet.absorption && (
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-900/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-blue-400" />
                  <h5 className={`font-semibold text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Absorption</h5>
                </div>
                <div className="space-y-1.5">
                  {admet.absorption.oral_bioavailability && (
                    <div className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Oral Bioavailability</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{admet.absorption.oral_bioavailability}</span>
                    </div>
                  )}
                  {admet.absorption.caco2_permeability && (
                    <div className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Caco-2 Permeability</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{admet.absorption.caco2_permeability}</span>
                    </div>
                  )}
                  {admet.absorption.hia && (
                    <div className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>HIA</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{admet.absorption.hia}</span>
                    </div>
                  )}
                  {admet.absorption.summary && (
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{admet.absorption.summary}</p>
                  )}
                </div>
              </div>
            )}

            {/* Distribution */}
            {admet.distribution && (
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-purple-900/10 border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <h5 className={`font-semibold text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>Distribution</h5>
                </div>
                <div className="space-y-1.5">
                  {admet.distribution.ppb && (
                    <div className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Plasma Protein Binding</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{admet.distribution.ppb}</span>
                    </div>
                  )}
                  {admet.distribution.bbb_penetration && (
                    <div className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>BBB Penetration</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{admet.distribution.bbb_penetration}</span>
                    </div>
                  )}
                  {admet.distribution.vdss && (
                    <div className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>VDss</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{admet.distribution.vdss}</span>
                    </div>
                  )}
                  {admet.distribution.summary && (
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{admet.distribution.summary}</p>
                  )}
                </div>
              </div>
            )}

            {/* Metabolism */}
            {admet.metabolism && (
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-amber-900/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Atom className="w-4 h-4 text-amber-400" />
                  <h5 className={`font-semibold text-sm ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>Metabolism</h5>
                </div>
                <div className="space-y-1.5">
                  {(admet.metabolism.cyp_interactions || []).slice(0, 5).map((cyp, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>{cyp.enzyme}</span>
                      <RiskBadge level={cyp.role} />
                    </div>
                  ))}
                  {admet.metabolism.summary && (
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{admet.metabolism.summary}</p>
                  )}
                </div>
              </div>
            )}

            {/* Excretion */}
            {admet.excretion && (
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-cyan-900/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h5 className={`font-semibold text-sm ${theme === 'dark' ? 'text-cyan-300' : 'text-cyan-700'}`}>Excretion</h5>
                </div>
                <div className="space-y-1.5">
                  {admet.excretion.half_life && (
                    <div className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Half-life</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{admet.excretion.half_life}</span>
                    </div>
                  )}
                  {admet.excretion.clearance && (
                    <div className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Clearance</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{admet.excretion.clearance}</span>
                    </div>
                  )}
                  {admet.excretion.summary && (
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{admet.excretion.summary}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toxicity */}
          {admet.toxicity && (
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-red-400" />
                <h5 className={`font-semibold text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>Toxicity Assessment</h5>
                {admet.toxicity.overall_risk && <RiskBadge level={admet.toxicity.overall_risk} />}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {admet.toxicity.herg_liability && (
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>hERG Liability</p>
                    <RiskBadge level={admet.toxicity.herg_liability} />
                  </div>
                )}
                {admet.toxicity.hepatotoxicity && (
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Hepatotoxicity</p>
                    <RiskBadge level={admet.toxicity.hepatotoxicity} />
                  </div>
                )}
                {admet.toxicity.ames_mutagenicity && (
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>AMES Mutagenicity</p>
                    <RiskBadge level={admet.toxicity.ames_mutagenicity} />
                  </div>
                )}
                {admet.toxicity.ld50_class && (
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>LD50 Class</p>
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{admet.toxicity.ld50_class}</span>
                  </div>
                )}
              </div>
              {admet.toxicity.summary && (
                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{admet.toxicity.summary}</p>
              )}
            </div>
          )}

          {/* Drug-likeness & Binding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {admet.druglikeness && (
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h5 className={`font-semibold text-sm ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>Drug-likeness</h5>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Lipinski Violations</span>
                    <span className={`text-lg font-bold ${
                      (admet.druglikeness.lipinski_violations || 0) <= 1 ? 'text-green-400' : 'text-red-400'
                    }`}>{admet.druglikeness.lipinski_violations ?? 'N/A'}</span>
                  </div>
                  {admet.druglikeness.bioavailability_score != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Bioavailability Score</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {typeof admet.druglikeness.bioavailability_score === 'number'
                            ? admet.druglikeness.bioavailability_score.toFixed(2) : admet.druglikeness.bioavailability_score}
                        </span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-400"
                          style={{ width: `${Math.min((admet.druglikeness.bioavailability_score || 0) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {admet.druglikeness.summary && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{admet.druglikeness.summary}</p>
                  )}
                </div>
              </div>
            )}

            {(admet.binding_affinity_estimate || docking) && (
              <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Dna className="w-4 h-4 text-indigo-400" />
                  <h5 className={`font-semibold text-sm ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`}>Binding Affinity</h5>
                </div>
                {docking ? (
                  <div className="space-y-2">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`}>
                      Chai-1 Docking Results
                    </p>
                    {(() => {
                      const d = typeof docking === 'string' ? (() => { try { return JSON.parse(docking); } catch { return null; } })() : docking;
                      if (d && typeof d === 'object') {
                        const score = d.aggregate_score ?? d.score ?? d.pTM ?? d.ptm;
                        const ipTM = d.ipTM ?? d.iptm;
                        return (
                          <div className="flex gap-4">
                            {score != null && (
                              <div>
                                <p className="text-xs text-slate-500">Score</p>
                                <p className={`text-sm font-bold ${score > 0.7 ? 'text-green-400' : score > 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                                  {typeof score === 'number' ? score.toFixed(3) : score}
                                </p>
                              </div>
                            )}
                            {ipTM != null && (
                              <div>
                                <p className="text-xs text-slate-500">ipTM</p>
                                <p className={`text-sm font-bold ${ipTM > 0.8 ? 'text-green-400' : 'text-amber-400'}`}>
                                  {typeof ipTM === 'number' ? ipTM.toFixed(3) : ipTM}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{String(docking)}</p>;
                    })()}
                  </div>
                ) : admet.binding_affinity_estimate ? (
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {admet.binding_affinity_estimate}
                  </p>
                ) : null}
                {protein && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Target Gene</span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{protein.gene}</span>
                    </div>
                    {protein.accession && (
                      <div className="flex justify-between text-xs">
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>UniProt</span>
                        <a href={`https://www.uniprot.org/uniprot/${protein.accession}`} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                          {protein.accession} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {protein.sequence_length && (
                      <div className="flex justify-between text-xs">
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Sequence Length</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{protein.sequence_length} aa</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {admet.confidence_note && (
            <p className={`text-xs italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
              {admet.confidence_note}
            </p>
          )}
        </>
      )}
    </div>
  );
}


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
  const [clinicalTrials, setClinicalTrials] = useState([]);
  const [loadingTrials, setLoadingTrials] = useState(false);

  const [relations, setRelations] = useState([]);
  const [admetModal, setAdmetModal] = useState(null);
  const [admetLoading, setAdmetLoading] = useState(false);
  const [admetResults, setAdmetResults] = useState({});
  const [admetError, setAdmetError] = useState(null);
  const [admetStep, setAdmetStep] = useState('');

  const [screeningResults, setScreeningResults] = useState({});
  const [screeningLoading, setScreeningLoading] = useState(null);
  const [screeningError, setScreeningError] = useState(null);

  const [dockingResults, setDockingResults] = useState({});

  useEffect(() => {
    loadExistingExperiments();
    loadClinicalTrials();
    loadRelations();
  }, []);

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
    } catch (err) {
      console.error('Error loading experiments:', err);
    }
  };

  const loadClinicalTrials = async () => {
    setLoadingTrials(true);
    try {
      const trials = await fetchClinicalTrials(project.disease_name);
      setClinicalTrials(trials);
    } catch (err) {
      console.warn('Failed to load clinical trials:', err);
    } finally {
      setLoadingTrials(false);
    }
  };

  const loadRelations = async () => {
    try {
      const rels = await Relation.filter({ project_id: project.id });
      setRelations(rels.filter(r => r.status !== 'rejected'));
    } catch (err) {
      console.warn('Failed to load relations:', err);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);
    setTimeRemaining(estimatedTime.max);
    setError(null);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) { clearInterval(progressInterval); return 95; }
        return prev + 3;
      });
    }, 450);

    try {
      const approvedHyps = await Hypothesis.filter({
        project_id: project.id,
        status: 'approved'
      });
      const hypContext = approvedHyps.map(h => `${h.title}: ${(h.description || '').slice(0, 200)}...`).join('\n\n');

      const trialsContext = clinicalTrials.length > 0
        ? `\n\nReal clinical trials from ClinicalTrials.gov for ${project.disease_name}:\n` +
          clinicalTrials.map(t =>
            `- ${t.nctId}: "${t.title}" | Phase: ${t.phase} | Status: ${t.status}${t.interventions.length ? ' | Interventions: ' + t.interventions.join(', ') : ''}${t.enrollment ? ' | N=' + t.enrollment : ''}`
          ).join('\n') +
          '\n\nDesign experiments that complement these existing trials and fill gaps in current research.'
        : '';

      const relContext = relations.length > 0
        ? `\n\nKnown drug-gene-disease relationships:\n` +
          relations.slice(0, 10).map(r =>
            `- Drug: ${r.drug || 'N/A'}, Gene/Target: ${r.gene || 'N/A'}, Disease: ${r.disease || project.disease_name}, Type: ${r.relationship_type || 'associated'}`
          ).join('\n') +
          '\n\nReference these specific drugs and gene targets in your experiment designs where relevant.'
        : '';

      const result = await Core.InvokeLLM({
        prompt: `Design 5-7 cutting-edge validation experiments for ${project.disease_name}:

${hypContext}${trialsContext}${relContext}

For each experiment provide:
- title (mention specific drug/gene names when applicable)
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
        setError('Limited experimental designs generated. Try adding more validated hypotheses or relationships from earlier stages.');
      }

      setExperiments(savedExps);
      setRetryCount(0);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate experiments. Please try again.');
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
        if (prev >= 95) { clearInterval(progressInterval); return 95; }
        return prev + 4;
      });
    }, 400);

    try {
      const { drugName, geneName } = extractDrugAndGene(exp, relations);

      const admetContext = admetResults[exp.id]
        ? `\n\nReal ADMET data for ${admetResults[exp.id]?.drug?.name || drugName} (source: ${admetResults[exp.id]?.source}):\n${JSON.stringify(admetResults[exp.id]?.admet || {}, null, 1)}`
        : '';

      const screenContext = screeningResults[exp.id]
        ? `\n\nModal RDKit screening results:\n${(screeningResults[exp.id]?.results || []).map(d => `- ${d.name}: QED=${d.qed}, MW=${d.mw}, LogP=${d.logp}, Lipinski=${d.lipinski_pass ? 'Pass' : 'Fail'}`).join('\n')}`
        : '';

      const relContext = relations.length > 0
        ? `\n\nValidated relationships:\n${relations.filter(r => r.status === 'valid').slice(0, 8).map(r => `- ${r.drug || 'N/A'} → ${r.gene || 'N/A'} (${r.relationship_type}): "${r.evidence}"`).join('\n')}`
        : '';

      const result = await Core.InvokeLLM({
        prompt: `You are a biomedical research analyst. Based on the following REAL data collected through this research pipeline, provide a critical analysis of this proposed experiment.

Experiment: "${exp.title}"
Type: ${exp.type}
Disease: ${project.disease_name}
Protocol: ${exp.description}
Drug: ${drugName || 'Not specified'}, Gene target: ${geneName || 'Not specified'}
${admetContext}${screenContext}${relContext}

Analyze this experiment based on the real data above. Do NOT invent data points. Do NOT fabricate p-values or statistics. Only reference data that was actually provided above.

Provide:
1. feasibility_assessment: Rate 1-5 based on the ADMET profile, drug-likeness, and protocol complexity
2. key_insights: 3-5 specific insights drawn from the real ADMET, screening, or relationship data provided — cite the actual values
3. risks: specific risks identified from the real data (e.g., ADMET toxicity flags, poor QED scores, Lipinski failures)
4. recommended_modifications: concrete suggestions to improve the experiment based on the data
5. literature_gaps: what additional data would strengthen this experiment
6. overall_score: 1-100 honest assessment of likelihood this experiment produces actionable results

Return as JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            feasibility_assessment: { type: "number" },
            key_insights: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            recommended_modifications: { type: "array", items: { type: "string" } },
            literature_gaps: { type: "array", items: { type: "string" } },
            overall_score: { type: "number" }
          }
        }
      });

      clearInterval(progressInterval);
      setProgress(100);
      setTimeRemaining(0);

      setExperimentResults(prev => ({ ...prev, [exp.id]: result }));

      const feasScore = result.feasibility_assessment || Math.ceil(result.overall_score / 20);
      await updateScore(exp.id, 'feasibility_score', Math.min(5, Math.max(1, feasScore)));
    } catch (err) {
      console.error('Experiment analysis error:', err);
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => setRunningExperiment(null), 500);
    }
  };

  const handleRunAdmet = async (exp) => {
    const { drugName, geneName } = extractDrugAndGene(exp, relations);
    console.log(`[ADMET] Experiment "${exp.title}" → drug="${drugName}", gene="${geneName}"`);

    setAdmetModal(exp);
    setAdmetLoading(true);
    setAdmetError(null);
    setAdmetStep('Looking up compound in PubChem...');

    try {
      if (!drugName) {
        throw new Error(`No drug name found for this experiment. Validate drug-gene relationships in the Evidence stage first.`);
      }
      const resolvedDrug = drugName;
      const resolvedGene = geneName || null;

      const afCached = resolvedGene ? getCachedAlphaFold(resolvedGene) : null;
      console.log(`[ADMET] Calling runExperiment → drugName="${resolvedDrug}", geneName="${resolvedGene}", alphaFoldCached=${!!afCached}`);

      setAdmetStep(afCached
        ? 'Found cached AlphaFold structure — submitting to ADMET + docking...'
        : 'Submitting to ADMET analysis pipeline...'
      );

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 5 minutes. The analysis may still be running — try again shortly.')), 300000)
      );

      const apiCall = Core.RunExperiment({
        drugName: resolvedDrug,
        geneName: resolvedGene,
        diseaseName: project.disease_name,
        experimentTitle: exp.title,
      });

      setAdmetStep('Running ADMET predictions (Tamarind Bio / Claude)...');
      const result = await Promise.race([apiCall, timeout]);

      setAdmetResults(prev => ({ ...prev, [exp.id]: result }));
      if (result.docking) {
        setDockingResults(prev => ({ ...prev, [exp.id]: result.docking }));
      }
      setAdmetStep('');
    } catch (err) {
      console.error('ADMET analysis error:', err);
      setAdmetError(err.message || 'ADMET analysis failed. Please try again.');
    } finally {
      setAdmetLoading(false);
    }
  };

  const handleScreenDrugs = async (exp) => {
    setScreeningLoading(exp.id);
    setScreeningError(null);

    try {
      let drugNames = extractDrugsForExperiment(exp, relations);
      console.log(`[ScreenDrugs] Experiment "${exp.title}" → extracted drugs:`, drugNames);

      if (drugNames.length === 0) {
        drugNames = [...new Set(
          relations
            .map(r => r.drug)
            .filter(d => d && d !== 'N/A' && d !== 'unknown drug')
        )];
        console.log(`[ScreenDrugs] Falling back to all relation drugs:`, drugNames);
      }

      if (drugNames.length === 0) {
        throw new Error('No drugs found for this experiment. Complete the Evidence stage first.');
      }

      const result = await Core.ScreenDrugs({ drugNames });
      setScreeningResults(prev => ({ ...prev, [exp.id]: result }));
    } catch (err) {
      console.error('Drug screening error:', err);
      setScreeningError(err.message || 'Drug screening failed.');
    } finally {
      setScreeningLoading(null);
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
            NOVUS designs experiments. Run AI simulations, ADMET analysis, or add your own results.
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
                <div className="rounded-lg p-4 mb-4 max-w-md mx-auto bg-red-500/20 border border-red-500/30">
                  <p className="text-sm mb-2 text-red-300">{error}</p>
                  {retryCount < 3 && (
                    <Button
                      onClick={() => { setRetryCount(retryCount + 1); handleGenerate(); }}
                      variant="outline" size="sm"
                      className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                    >
                      Retry ({retryCount + 1}/3)
                    </Button>
                  )}
                </div>
              )}
              <Button onClick={handleGenerate} className="bg-cyan-600 hover:bg-cyan-700" disabled={generating}>
                <FlaskConical className="w-4 h-4 mr-2" />
                Design Experiments
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress Card */}
        <AnimatePresence>
          {generating && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
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
                      <div className={`h-2 rounded-full overflow-hidden mb-6 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div className={`space-y-2 text-sm text-left ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        <motion.p animate={{ opacity: progress > 8 ? 1 : 0.3 }}>
                          {progress > 8 ? '✓' : '→'} Analyzing approved hypotheses...
                        </motion.p>
                        <motion.p animate={{ opacity: progress > 20 ? 1 : 0.3 }}>
                          {progress > 20 ? '✓' : '→'} Fetching clinical trials from ClinicalTrials.gov...
                        </motion.p>
                        <motion.p animate={{ opacity: progress > 35 ? 1 : 0.3 }}>
                          {progress > 35 ? '✓' : '→'} Mapping drug-gene-disease relationships...
                        </motion.p>
                        <motion.p animate={{ opacity: progress > 50 ? 1 : 0.3 }}>
                          {progress > 50 ? '✓' : '→'} Designing validation protocols...
                        </motion.p>
                        <motion.p animate={{ opacity: progress > 70 ? 1 : 0.3 }}>
                          {progress > 70 ? '✓' : '→'} Estimating resources & timeline...
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

        {/* Clinical Trials */}
        {(clinicalTrials.length > 0 || loadingTrials) && (
          <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
            <CardContent className="p-6">
              <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <FlaskConical className="w-5 h-5 text-green-400" />
                Related Clinical Trials (ClinicalTrials.gov)
              </h3>
              {loadingTrials ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-green-400" />
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Searching ClinicalTrials.gov...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicalTrials.map((trial) => (
                    <div key={trial.nctId} className={`flex items-start justify-between p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <a href={`https://clinicaltrials.gov/study/${trial.nctId}`} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
                            {trial.nctId} <ExternalLink className="w-3 h-3" />
                          </a>
                          <Badge className={
                            trial.status === 'RECRUITING' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            trial.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                            'bg-slate-500/20 text-slate-300 border-slate-500/30'
                          }>{trial.status}</Badge>
                          <Badge variant="outline" className="border-purple-500/30 text-purple-300">{trial.phase}</Badge>
                          {trial.enrollment && (
                            <span className="text-xs text-slate-500">N={trial.enrollment}</span>
                          )}
                        </div>
                        <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{trial.title}</p>
                        {trial.interventions.length > 0 && (
                          <p className="text-xs mt-1 text-slate-500">Interventions: {trial.interventions.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {clinicalTrials.length === 0 && (
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      No clinical trials found for {project.disease_name}.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Experiments Grid */}
        <AnimatePresence>
          {!generating && experiments.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6">
              {experiments.map((exp) => (
                <Card key={exp.id} className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{exp.title}</h3>
                          <Badge className={getTypeColor(exp.type)}>{exp.type?.replace('_', ' ')}</Badge>
                        </div>

                        <p className={`leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{exp.description}</p>

                        {/* External Resources */}
                        <div className="mb-4 flex flex-wrap gap-2">
                          <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(project.disease_name + ' ' + exp.type)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors flex items-center gap-1">
                            PubMed Research
                          </a>
                          <a href={`https://clinicaltrials.gov/search?term=${encodeURIComponent(project.disease_name)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors flex items-center gap-1">
                            Clinical Trials
                          </a>
                          <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(project.disease_name + ' ' + exp.type + ' protocol')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors flex items-center gap-1">
                            Google Scholar
                          </a>
                        </div>

                        <div className={`grid grid-cols-2 gap-4 mb-4 p-4 rounded ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-100'}`}>
                          <div>
                            <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Estimated Cost</p>
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{exp.estimated_cost}</p>
                          </div>
                          <div>
                            <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Duration</p>
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{exp.estimated_duration}</p>
                          </div>
                        </div>

                        {/* ADMET Results Inline Preview */}
                        {admetResults[exp.id] && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
                            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-emerald-900/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Beaker className="w-4 h-4 text-emerald-400" />
                                  <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                    ADMET Analysis Complete
                                  </h4>
                                </div>
                                <Button size="sm" variant="outline"
                                  className={`text-xs ${theme === 'dark' ? 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10' : 'border-emerald-300'}`}
                                  onClick={() => { setAdmetModal(exp); setAdmetLoading(false); setAdmetError(null); }}>
                                  View Full Report
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                {admetResults[exp.id]?.admet?.toxicity?.overall_risk && (
                                  <div>
                                    <p className="text-xs text-slate-500">Toxicity Risk</p>
                                    <RiskBadge level={admetResults[exp.id].admet.toxicity.overall_risk} />
                                  </div>
                                )}
                                {admetResults[exp.id]?.admet?.druglikeness?.bioavailability_score != null && (
                                  <div>
                                    <p className="text-xs text-slate-500">Bioavailability</p>
                                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                      {typeof admetResults[exp.id].admet.druglikeness.bioavailability_score === 'number'
                                        ? admetResults[exp.id].admet.druglikeness.bioavailability_score.toFixed(2)
                                        : admetResults[exp.id].admet.druglikeness.bioavailability_score}
                                    </span>
                                  </div>
                                )}
                                {admetResults[exp.id]?.drug?.molecular_formula && (
                                  <div>
                                    <p className="text-xs text-slate-500">Formula</p>
                                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                      {admetResults[exp.id].drug.molecular_formula}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Parallel Drug Screening Results */}
                        {screeningResults[exp.id] && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
                            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-orange-900/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-5 h-5 text-orange-400" />
                                <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>
                                  Parallel Drug Screening
                                </h4>
                                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                                  {screeningResults[exp.id].screened} compounds
                                </Badge>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className={`border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                      <th className={`text-left py-2 pr-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Rank</th>
                                      <th className={`text-left py-2 pr-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Drug Name</th>
                                      <th className={`text-left py-2 pr-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        <span className="flex items-center gap-1">QED Score <ArrowUpDown className="w-3 h-3" /></span>
                                      </th>
                                      <th className={`text-left py-2 pr-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>MW (g/mol)</th>
                                      <th className={`text-left py-2 pr-3 text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>LogP</th>
                                      <th className={`text-left py-2 text-xs font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Lipinski</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(screeningResults[exp.id].results || []).map((drug, idx) => (
                                      <tr key={idx} className={`border-b last:border-0 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                                        <td className={`py-2 pr-3 font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </td>
                                        <td className={`py-2 pr-3 font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                          {drug.name}
                                          {drug.error && <span className="text-xs text-red-400 ml-1">({drug.error})</span>}
                                        </td>
                                        <td className="py-2 pr-3">
                                          <div className="flex items-center gap-2">
                                            <span className={`font-bold ${
                                              drug.qed >= 0.67 ? 'text-green-400' :
                                              drug.qed >= 0.33 ? 'text-amber-400' : 'text-red-400'
                                            }`}>{drug.qed?.toFixed(3)}</span>
                                            <div className={`w-16 h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                              <div className={`h-full rounded-full ${
                                                drug.qed >= 0.67 ? 'bg-green-400' :
                                                drug.qed >= 0.33 ? 'bg-amber-400' : 'bg-red-400'
                                              }`} style={{ width: `${(drug.qed || 0) * 100}%` }} />
                                            </div>
                                          </div>
                                        </td>
                                        <td className={`py-2 pr-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                          {drug.mw || '—'}
                                        </td>
                                        <td className={`py-2 pr-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                          {drug.logp || '—'}
                                        </td>
                                        <td className="py-2">
                                          {drug.lipinski_pass ? (
                                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">Pass</Badge>
                                          ) : (
                                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                                              Fail ({drug.lipinski_violations})
                                            </Badge>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <p className={`text-xs mt-3 flex items-center gap-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                <Zap className="w-3 h-3" />
                                Screened {screeningResults[exp.id].screened} compounds in parallel on Modal
                                {screeningResults[exp.id].drugs_submitted !== screeningResults[exp.id].drugs_requested && (
                                  <span className="ml-1">
                                    ({screeningResults[exp.id].drugs_requested - screeningResults[exp.id].drugs_submitted} drugs not found in PubChem)
                                  </span>
                                )}
                              </p>
                            </div>
                          </motion.div>
                        )}

                        {screeningLoading === exp.id && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4">
                            <div className={`p-6 rounded-lg border text-center ${theme === 'dark' ? 'bg-orange-900/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                              <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
                              <p className={`font-medium text-sm ${theme === 'dark' ? 'text-orange-300' : 'text-orange-700'}`}>
                                Screening drugs in parallel on Modal...
                              </p>
                              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                Looking up SMILES from PubChem, then running RDKit QED + Lipinski
                              </p>
                            </div>
                          </motion.div>
                        )}

                        {screeningError && screeningLoading !== exp.id && !screeningResults[exp.id] && (
                          <div className={`p-3 rounded-lg mb-4 ${theme === 'dark' ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
                            <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-600'}`}>{screeningError}</p>
                          </div>
                        )}

                        {/* Docking / Binding Affinity Results */}
                        {dockingResults[exp.id] && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
                            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200'}`}>
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <Dna className="w-5 h-5 text-indigo-400" />
                                <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                  Chai-1 Molecular Docking
                                </h4>
                                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                                  Tamarind Bio
                                </Badge>
                                {(() => {
                                  const { geneName } = extractDrugAndGene(exp, relations);
                                  const afCached = geneName ? getCachedAlphaFold(geneName) : null;
                                  return afCached ? (
                                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                      AlphaFold structure used
                                    </Badge>
                                  ) : null;
                                })()}
                              </div>
                              {(() => {
                                const dock = dockingResults[exp.id];
                                const dockObj = typeof dock === 'string' ? (() => { try { return JSON.parse(dock); } catch { return null; } })() : dock;
                                if (dockObj && typeof dockObj === 'object') {
                                  const score = dockObj.aggregate_score ?? dockObj.score ?? dockObj.pTM ?? dockObj.ptm;
                                  const ipTM = dockObj.ipTM ?? dockObj.iptm;
                                  const pLDDT = dockObj.pLDDT ?? dockObj.plddt ?? dockObj.average_plddt;
                                  return (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-3 gap-3">
                                        {score != null && (
                                          <div className={`p-3 rounded ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'}`}>
                                            <p className="text-xs text-slate-500">Confidence Score</p>
                                            <p className={`text-lg font-bold ${score > 0.7 ? 'text-green-400' : score > 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                                              {typeof score === 'number' ? score.toFixed(3) : score}
                                            </p>
                                          </div>
                                        )}
                                        {ipTM != null && (
                                          <div className={`p-3 rounded ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'}`}>
                                            <p className="text-xs text-slate-500">ipTM</p>
                                            <p className={`text-lg font-bold ${ipTM > 0.8 ? 'text-green-400' : ipTM > 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                                              {typeof ipTM === 'number' ? ipTM.toFixed(3) : ipTM}
                                            </p>
                                          </div>
                                        )}
                                        {pLDDT != null && (
                                          <div className={`p-3 rounded ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'}`}>
                                            <p className="text-xs text-slate-500">pLDDT</p>
                                            <p className={`text-lg font-bold ${pLDDT > 70 ? 'text-green-400' : pLDDT > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                              {typeof pLDDT === 'number' ? pLDDT.toFixed(1) : pLDDT}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      {!score && !ipTM && !pLDDT && (
                                        <div className={`text-xs p-3 rounded overflow-auto max-h-24 ${theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700'}`}>
                                          <pre className="whitespace-pre-wrap">{JSON.stringify(dockObj, null, 2)}</pre>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return (
                                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                    {String(dock)}
                                  </p>
                                );
                              })()}
                              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                                Structure prediction + docking via Chai-1 on Tamarind Bio
                              </p>
                            </div>
                          </motion.div>
                        )}

                        {/* AI Analysis Results */}
                        {experimentResults[exp.id] && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-4">
                            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900/15 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <Activity className="w-5 h-5 text-blue-400" />
                                <h4 className={`font-bold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>AI Experiment Analysis</h4>
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                                  Based on pipeline data
                                </Badge>
                              </div>

                              {experimentResults[exp.id].overall_score != null && (
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs text-slate-500">Feasibility Score</p>
                                    <span className={`text-lg font-bold ${
                                      experimentResults[exp.id].overall_score >= 70 ? 'text-green-400' :
                                      experimentResults[exp.id].overall_score >= 40 ? 'text-amber-400' : 'text-red-400'
                                    }`}>{experimentResults[exp.id].overall_score}/100</span>
                                  </div>
                                  <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                    <div className={`h-full ${
                                      experimentResults[exp.id].overall_score >= 70 ? 'bg-green-400' :
                                      experimentResults[exp.id].overall_score >= 40 ? 'bg-amber-400' : 'bg-red-400'
                                    }`} style={{ width: `${experimentResults[exp.id].overall_score}%` }} />
                                  </div>
                                </div>
                              )}

                              {experimentResults[exp.id].key_insights?.length > 0 && (
                                <div className="mb-4">
                                  <p className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Key Insights (from real data):</p>
                                  <ul className="space-y-1.5">
                                    {experimentResults[exp.id].key_insights.map((insight, idx) => (
                                      <li key={idx} className={`text-sm flex items-start gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />{insight}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {experimentResults[exp.id].risks?.length > 0 && (
                                <div className="mb-4">
                                  <p className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>Identified Risks:</p>
                                  <ul className="space-y-1.5">
                                    {experimentResults[exp.id].risks.map((risk, idx) => (
                                      <li key={idx} className={`text-sm flex items-start gap-2 ${theme === 'dark' ? 'text-red-200/80' : 'text-red-700'}`}>
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />{risk}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {experimentResults[exp.id].recommended_modifications?.length > 0 && (
                                <div className="mb-4">
                                  <p className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>Recommended Modifications:</p>
                                  <ul className="space-y-1.5">
                                    {experimentResults[exp.id].recommended_modifications.map((mod, idx) => (
                                      <li key={idx} className={`text-sm flex items-start gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                        <span className="text-amber-400 shrink-0">→</span>{mod}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {experimentResults[exp.id].literature_gaps?.length > 0 && (
                                <div>
                                  <p className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Data Gaps to Address:</p>
                                  <ul className="space-y-1">
                                    {experimentResults[exp.id].literature_gaps.map((gap, idx) => (
                                      <li key={idx} className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                        • {gap}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4 flex-wrap">
                          {!experimentResults[exp.id] && (
                            <>
                              <Button onClick={() => handleRunAIExperiment(exp)}
                                disabled={runningExperiment === exp.id}
                                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                                {runningExperiment === exp.id ? (
                                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                                ) : (
                                  <><Play className="w-4 h-4 mr-2" />Analyze Experiment</>
                                )}
                              </Button>
                              <Button variant="outline" className={theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}>
                                <Plus className="w-4 h-4 mr-2" />Add My Results
                              </Button>
                            </>
                          )}
                          {!admetResults[exp.id] && (
                            <Button onClick={() => handleRunAdmet(exp)}
                              disabled={admetLoading && admetModal?.id === exp.id}
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                              {admetLoading && admetModal?.id === exp.id ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                              ) : (
                                <><Beaker className="w-4 h-4 mr-2" />ADMET Analysis</>
                              )}
                            </Button>
                          )}
                          {!screeningResults[exp.id] && (
                            <Button onClick={() => handleScreenDrugs(exp)}
                              disabled={screeningLoading === exp.id}
                              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                              {screeningLoading === exp.id ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Screening...</>
                              ) : (
                                <><Zap className="w-4 h-4 mr-2" />Screen Drugs</>
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Rating Section */}
                        {(experimentResults[exp.id] || admetResults[exp.id] || screeningResults[exp.id] || dockingResults[exp.id] || exp.feasibility_score) && (
                          <div className={`space-y-3 mt-6 pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
                            {['feasibility_score', 'impact_score', 'novelty_score'].map((field) => (
                              <div key={field}>
                                <label className="text-sm text-slate-400 mb-2 block capitalize">{field.replace('_', ' ')}</label>
                                <div className="flex gap-2">
                                  {[1, 2, 3, 4, 5].map((score) => (
                                    <button key={score} onClick={() => updateScore(exp.id, field, score)}
                                      className={`w-10 h-10 rounded-lg transition-all ${
                                        exp[field] === score ? 'bg-cyan-500 text-white'
                                        : theme === 'dark' ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                      }`}>
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
            <Button onClick={onComplete} disabled={!allRated} className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
              {allRated ? 'Continue to Paper Drafting' : 'Rate All Experiments to Continue'}
            </Button>
          </div>
        )}
      </div>

      {/* ADMET Analysis Modal */}
      <Dialog open={!!admetModal} onOpenChange={(open) => { if (!open) setAdmetModal(null); }}>
        <DialogContent className={`max-w-3xl max-h-[85vh] overflow-y-auto ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="w-5 h-5 text-emerald-400" />
              ADMET & Binding Analysis
            </DialogTitle>
            <DialogDescription className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
              {admetModal?.title}
            </DialogDescription>
          </DialogHeader>

          {admetLoading && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-emerald-400 animate-spin" />
                <Beaker className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-2">
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  Running ADMET Analysis Pipeline
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  {admetStep}
                </p>
                <div className={`mt-4 space-y-2 text-xs text-left max-w-sm mx-auto ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                  <p className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Looking up SMILES from PubChem
                  </p>
                  <p className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching protein sequence from UniProt
                  </p>
                  <p className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Running ADMET predictions
                  </p>
                  <p className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Estimating binding affinity
                  </p>
                </div>
              </div>
            </div>
          )}

          {admetError && (
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <p className={`font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>Analysis Failed</p>
              </div>
              <p className={`text-sm ${theme === 'dark' ? 'text-red-200' : 'text-red-600'}`}>{admetError}</p>
              <Button className="mt-3 bg-red-600 hover:bg-red-700" size="sm"
                onClick={() => { if (admetModal) handleRunAdmet(admetModal); }}>
                Retry Analysis
              </Button>
            </div>
          )}

          {!admetLoading && !admetError && admetModal && admetResults[admetModal.id] && (
            <AdmetResultsPanel results={admetResults[admetModal.id]} theme={theme} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
