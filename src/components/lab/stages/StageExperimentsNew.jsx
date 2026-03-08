import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical, Loader2, Star, Play, Plus, TrendingUp, BarChart2,
  Activity, ExternalLink, Beaker, ShieldCheck, AlertTriangle, Atom,
  Pill, Dna, X, CheckCircle2, XCircle
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
                  <div className="space-y-1">
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      Tamarind Docking result available
                    </p>
                    <pre className={`text-xs p-2 rounded overflow-auto max-h-24 ${
                      theme === 'dark' ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-700'
                    }`}>{typeof docking === 'string' ? docking : JSON.stringify(docking, null, 2)}</pre>
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
        setError('Limited experimental designs due to novel research context. Future NOVUS updates will better support frontier research.');
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
      const result = await Core.InvokeLLM({
        prompt: `Simulate ${exp.type} experiment: "${exp.title}" for ${project.disease_name}.

Generate realistic experimental results:
- success_rate: 0-100%
- key_findings: array of 3-5 findings
- data_points: array of 10-15 numeric measurements
- statistical_significance: p-value
- visualization_data: time series data for graph
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

      setExperimentResults(prev => ({ ...prev, [exp.id]: result }));

      await updateScore(exp.id, 'feasibility_score', Math.floor(result.success_rate / 20));
      await updateScore(exp.id, 'impact_score', result.success_rate > 70 ? 5 : result.success_rate > 50 ? 4 : 3);
      await updateScore(exp.id, 'novelty_score', 4);
    } catch (err) {
      console.error('Experiment run error:', err);
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => setRunningExperiment(null), 500);
    }
  };

  const handleRunAdmet = async (exp) => {
    const { drugName, geneName } = extractDrugAndGene(exp, relations);
    setAdmetModal(exp);
    setAdmetLoading(true);
    setAdmetError(null);
    setAdmetStep('Looking up compound in PubChem...');

    try {
      setAdmetStep('Submitting to ADMET analysis pipeline...');

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 5 minutes. The analysis may still be running — try again shortly.')), 300000)
      );

      const apiCall = Core.RunExperiment({
        drugName: drugName || project.disease_name,
        geneName: geneName || null,
        diseaseName: project.disease_name,
        experimentTitle: exp.title,
      });

      setAdmetStep('Running ADMET predictions (Tamarind Bio / Claude)...');
      const result = await Promise.race([apiCall, timeout]);

      setAdmetResults(prev => ({ ...prev, [exp.id]: result }));
      setAdmetStep('');
    } catch (err) {
      console.error('ADMET analysis error:', err);
      setAdmetError(err.message || 'ADMET analysis failed. Please try again.');
    } finally {
      setAdmetLoading(false);
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

                        {/* AI Simulation Results */}
                        {experimentResults[exp.id] && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-4">
                            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <Activity className="w-5 h-5 text-green-400" />
                                <h4 className={`font-bold ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>AI Simulation Results</h4>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">Success Rate</p>
                                  <p className="text-2xl font-bold text-green-400">{experimentResults[exp.id].success_rate}%</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500 mb-1">P-Value</p>
                                  <p className="text-2xl font-bold text-cyan-400">{experimentResults[exp.id].statistical_significance?.toFixed(4)}</p>
                                </div>
                              </div>
                              <div className="mb-4">
                                <p className="text-xs text-slate-500 mb-2">Key Findings:</p>
                                <ul className="space-y-1">
                                  {experimentResults[exp.id].key_findings?.map((finding, idx) => (
                                    <li key={idx} className={`text-sm flex items-start gap-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                      <span className="text-green-400">•</span>{finding}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {experimentResults[exp.id].molecular_markers && (
                                <div>
                                  <p className="text-xs text-slate-500 mb-2">Molecular Expression Levels:</p>
                                  <div className="space-y-2">
                                    {experimentResults[exp.id].molecular_markers.slice(0, 5).map((marker, idx) => (
                                      <div key={idx}>
                                        <div className="flex justify-between text-xs mb-1">
                                          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>{marker.name}</span>
                                          <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{marker.treated}x (from {marker.baseline}x)</span>
                                        </div>
                                        <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                                          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                            style={{ width: `${Math.min(marker.treated * 10, 100)}%` }} />
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
                        <div className="flex gap-2 mt-4 flex-wrap">
                          {!experimentResults[exp.id] && (
                            <>
                              <Button onClick={() => handleRunAIExperiment(exp)}
                                disabled={runningExperiment === exp.id}
                                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                                {runningExperiment === exp.id ? (
                                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</>
                                ) : (
                                  <><Play className="w-4 h-4 mr-2" />Run AI Experiment</>
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
                        </div>

                        {/* Rating Section */}
                        {(experimentResults[exp.id] || admetResults[exp.id] || exp.feasibility_score) && (
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
