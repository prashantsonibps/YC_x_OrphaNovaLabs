import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '../ThemeContext';
import { ToggleLeft, ToggleRight } from 'lucide-react';

const STORAGE_KEY = 'orphanova_feature_flags';

const DEFAULT_FLAGS = [
  { id: 'open_targets', label: 'Open Targets Integration', description: 'Fetch association scores from Open Targets in Evidence stage', default: true },
  { id: 'uniprot', label: 'UniProt Enrichment', description: 'Fetch protein data from UniProt for gene relationships', default: true },
  { id: 'pubchem', label: 'PubChem Drug Data', description: 'Look up molecular data via PubChem PUG REST API', default: true },
  { id: 'clinical_trials', label: 'ClinicalTrials.gov', description: 'Pull clinical trial data for experiment design', default: true },
  { id: 'alphafold', label: 'AlphaFold Structures', description: 'Predict/fetch 3D protein structures via AlphaFold DB', default: true },
  { id: 'modal_screening', label: 'Modal Drug Screening', description: 'Parallel RDKit screening via Modal serverless', default: true },
  { id: 'tamarind_admet', label: 'Tamarind ADMET', description: 'Real ADMET predictions via Tamarind Bio', default: true },
  { id: 'tamarind_docking', label: 'Chai-1 Docking', description: 'Molecular docking via Chai-1 on Tamarind Bio', default: true },
];

export function getFlag(id) {
  const flags = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const def = DEFAULT_FLAGS.find(f => f.id === id);
  return flags[id] ?? def?.default ?? true;
}

export default function FeatureFlags() {
  const { theme } = useTheme();
  const [flags, setFlags] = useState({});

  useEffect(() => {
    setFlags(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  }, []);

  const toggle = (id, currentDefault) => {
    const current = flags[id] ?? currentDefault;
    const next = { ...flags, [id]: !current };
    setFlags(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          <ToggleRight className="w-5 h-5" /> Feature Flags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {DEFAULT_FLAGS.map(flag => {
            const enabled = flags[flag.id] ?? flag.default;
            return (
              <div key={flag.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? enabled ? 'bg-green-900/10 border-green-500/20' : 'bg-slate-900/50 border-slate-700'
                    : enabled ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                }`}
                onClick={() => toggle(flag.id, flag.default)}>
                <div>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{flag.label}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{flag.description}</p>
                </div>
                {enabled
                  ? <ToggleRight className="w-8 h-8 text-green-400 shrink-0" />
                  : <ToggleLeft className="w-8 h-8 text-slate-500 shrink-0" />
                }
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
