import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2, X, FileText, Database, FlaskConical, Pill, Dna, Activity, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Literature, Relation, Hypothesis, Experiment, Draft } from '@/api/entities';
import { Core } from '@/api/integrationsClient';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const AF_CACHE_PREFIX = 'orphanova_alphafold_';
function getCachedAlphaFold(geneName) {
  if (!geneName) return null;
  try {
    const raw = localStorage.getItem(`${AF_CACHE_PREFIX}${geneName.toUpperCase()}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

export default function FullResearchReport({ project, open, onClose }) {
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);
  const [execSummary, setExecSummary] = useState(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [literature, relations, hypotheses, experiments, drafts] = await Promise.all([
        Literature.filter({ project_id: project.id }),
        Relation.filter({ project_id: project.id }),
        Hypothesis.filter({ project_id: project.id }),
        Experiment.filter({ project_id: project.id }),
        Draft.filter({ project_id: project.id }),
      ]);

      const validRelations = relations.filter(r => r.status === 'valid');

      const genes = [];
      const seen = new Set();
      for (const r of validRelations) {
        if (r.gene && r.gene !== 'N/A' && !seen.has(r.gene)) {
          seen.add(r.gene);
          genes.push({
            name: r.gene,
            otScore: r.ot_score,
            uniprotDesc: r.uniprot?.function || r.uniprot?.protein_name || '',
            accession: r.uniprot?.accession || '',
            alphafold: getCachedAlphaFold(r.gene),
          });
        }
      }

      const screeningKey = `orphanova_screening_${project.id}`;
      let screening = null;
      try { screening = JSON.parse(localStorage.getItem(screeningKey)); } catch {}

      const admetKey = `orphanova_admet_${project.id}`;
      let admetData = null;
      try { admetData = JSON.parse(localStorage.getItem(admetKey)); } catch {}

      const trialsKey = `orphanova_trials_${project.id}`;
      let trialsData = null;
      try { trialsData = JSON.parse(localStorage.getItem(trialsKey)); } catch {}

      const loaded = {
        literature: literature.filter(l => l.selected),
        relations: validRelations,
        allRelations: relations,
        hypotheses: hypotheses.filter(h => h.status === 'approved'),
        experiments,
        draft: drafts[0] || null,
        genes,
        screening,
        admetData,
        trialsData,
      };

      setData(loaded);

      const summaryPrompt = `You are writing an executive summary for a rare disease research report on "${project.disease_name}".

Data collected:
- ${loaded.literature.length} papers analyzed
- ${validRelations.length} validated drug-gene-disease relationships (genes: ${genes.map(g => g.name).join(', ')})
- ${loaded.hypotheses.length} approved hypotheses
- ${loaded.experiments.length} experiment designs

Write exactly 4 bullet points (each 1 sentence) summarizing the most important findings. Be specific, cite actual gene/drug names. Return JSON: { "bullets": ["...", "...", "...", "..."] }`;

      try {
        const summary = await Core.InvokeLLM({
          prompt: summaryPrompt,
          response_json_schema: {
            type: "object",
            properties: { bullets: { type: "array", items: { type: "string" } } }
          }
        });
        setExecSummary(summary.bullets || []);
      } catch {
        setExecSummary([
          `Analyzed ${loaded.literature.length} papers on ${project.disease_name}`,
          `Identified ${genes.length} gene targets with validated relationships`,
          `${loaded.hypotheses.length} testable hypotheses generated from evidence`,
          `${loaded.experiments.length} experiment designs proposed`
        ]);
      }
    } catch (err) {
      console.error('Report data load error:', err);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (open) loadAllData();
  }, [open, loadAllData]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const el = reportRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = pdfW / imgW;
      const scaledH = imgH * ratio;

      let position = 0;
      let remaining = scaledH;

      while (remaining > 0) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -position, pdfW, scaledH);
        position += pdfH;
        remaining -= pdfH;
      }

      const safeName = (project.disease_name || 'research').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
      pdf.save(`${safeName}_research_report.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('PDF export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Sticky header */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h2 className="text-white font-bold text-lg">Full Research Report</h2>
          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{project.disease_name}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleDownloadPDF}
            disabled={loading || exporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Download PDF</>
            )}
          </Button>
          <Button onClick={onClose} variant="ghost" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-slate-200">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-500" />
            <p className="text-slate-600 font-medium">Compiling research report...</p>
          </div>
        ) : data ? (
          <div className="max-w-[850px] mx-auto my-8">
            <div ref={reportRef} className="bg-white shadow-xl" style={{ fontFamily: "'Inter', 'Helvetica', sans-serif", color: '#1e293b' }}>

              {/* 1. Header */}
              <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '48px 56px', color: 'white' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.7, marginBottom: 12 }}>Research Report</div>
                <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>{project.disease_name}</h1>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{today}</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Generated by NOVUS · OrphaNova Research</div>
              </div>

              <div style={{ padding: '40px 56px' }}>

                {/* 2. Executive Summary */}
                <section style={{ marginBottom: 40 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, borderBottom: '2px solid #0ea5e9', paddingBottom: 8, marginBottom: 16 }}>Executive Summary</h2>
                  {execSummary && execSummary.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {execSummary.map((b, i) => (
                        <li key={i} style={{ padding: '8px 0 8px 20px', borderLeft: '3px solid #0ea5e9', marginBottom: 8, fontSize: 14, lineHeight: 1.6, background: '#f8fafc' }}>
                          {b}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: 14, color: '#64748b' }}>Generating summary...</p>
                  )}
                </section>

                {/* 3. Pipeline Stats */}
                <section style={{ marginBottom: 40 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[
                      { label: 'Papers Analyzed', value: data.literature.length, icon: '📄' },
                      { label: 'Validated Relations', value: data.relations.length, icon: '🔗' },
                      { label: 'Hypotheses', value: data.hypotheses.length, icon: '💡' },
                      { label: 'Experiments', value: data.experiments.length, icon: '🧪' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. Validated Targets */}
                {data.genes.length > 0 && (
                  <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, borderBottom: '2px solid #4f46e5', paddingBottom: 8, marginBottom: 16 }}>Validated Gene Targets</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Gene</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>OpenTargets</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>UniProt Description</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>AlphaFold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.genes.map((g, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{g.name}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {g.otScore != null ? (
                                <span style={{
                                  background: g.otScore >= 0.5 ? '#dcfce7' : g.otScore > 0 ? '#fef3c7' : '#f1f5f9',
                                  color: g.otScore >= 0.5 ? '#166534' : g.otScore > 0 ? '#92400e' : '#64748b',
                                  padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600
                                }}>{typeof g.otScore === 'number' ? g.otScore.toFixed(3) : g.otScore}</span>
                              ) : <span style={{ color: '#94a3b8' }}>—</span>}
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: 12, color: '#475569', maxWidth: 300 }}>
                              {g.uniprotDesc ? g.uniprotDesc.slice(0, 120) + (g.uniprotDesc.length > 120 ? '...' : '') : '—'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              {g.alphafold?.status === 'completed' ? (
                                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>Structure Available</span>
                              ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )}

                {/* 5. Drug Candidates from relations */}
                {(() => {
                  const drugs = [];
                  const drugSeen = new Set();
                  for (const r of data.relations) {
                    if (r.drug && r.drug !== 'N/A' && !drugSeen.has(r.drug)) {
                      drugSeen.add(r.drug);
                      drugs.push({ name: r.drug, confidence: r.confidence });
                    }
                  }
                  if (drugs.length === 0) return null;
                  return (
                    <section style={{ marginBottom: 40 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 700, borderBottom: '2px solid #059669', paddingBottom: 8, marginBottom: 16 }}>Drug Candidates</h2>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0', width: 50 }}>Rank</th>
                            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Drug Name</th>
                            <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0' }}>Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {drugs.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).map((d, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>#{i + 1}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{d.name}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                  <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${d.confidence || 0}%`, height: '100%', background: '#059669', borderRadius: 3 }} />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>{d.confidence || 0}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  );
                })()}

                {/* 6. Hypotheses */}
                {data.hypotheses.length > 0 && (
                  <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, borderBottom: '2px solid #f59e0b', paddingBottom: 8, marginBottom: 16 }}>Approved Hypotheses</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {data.hypotheses.map((h, i) => (
                        <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', background: '#fffbeb' }}>
                          <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>Hypothesis {i + 1}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>{h.title}</div>
                          {h.description && (
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.5 }}>
                              {stripHtml(h.description).slice(0, 200)}{stripHtml(h.description).length > 200 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 7. Top Experiments */}
                {data.experiments.length > 0 && (
                  <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, borderBottom: '2px solid #dc2626', paddingBottom: 8, marginBottom: 16 }}>Top Experiment Designs</h2>
                    <div style={{ display: 'grid', gap: 16 }}>
                      {data.experiments
                        .sort((a, b) => ((b.feasibility_score || 0) + (b.impact_score || 0) + (b.novelty_score || 0)) - ((a.feasibility_score || 0) + (a.impact_score || 0) + (a.novelty_score || 0)))
                        .slice(0, 3)
                        .map((exp, i) => (
                        <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '20px', background: '#fef2f2' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <span style={{ fontSize: 11, background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 4, fontWeight: 600, marginRight: 8 }}>{exp.type || 'experiment'}</span>
                              <span style={{ fontSize: 14, fontWeight: 700 }}>{exp.title}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 12 }}>
                            {stripHtml(exp.description || '').slice(0, 250)}{(exp.description || '').length > 250 ? '...' : ''}
                          </div>
                          <div style={{ display: 'flex', gap: 16 }}>
                            {[
                              { label: 'Feasibility', val: exp.feasibility_score },
                              { label: 'Impact', val: exp.impact_score },
                              { label: 'Novelty', val: exp.novelty_score },
                            ].map((s, j) => (
                              <div key={j} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: s.val >= 4 ? '#059669' : s.val >= 3 ? '#f59e0b' : '#64748b' }}>{s.val || '—'}<span style={{ fontSize: 11, fontWeight: 400 }}>/5</span></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 8. Research Paper (if exists) */}
                {data.draft && (
                  <section style={{ marginBottom: 40 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, borderBottom: '2px solid #6366f1', paddingBottom: 8, marginBottom: 16 }}>Research Paper</h2>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '32px 40px', background: '#fafafa' }}>
                      <h3 style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 8, lineHeight: 1.3 }}>
                        {stripHtml(data.draft.title)}
                      </h3>
                      <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginBottom: 24 }}>
                        OrphaNova Research · {today}
                      </p>

                      {data.draft.abstract && (
                        <div style={{ margin: '0 24px 24px', padding: '16px 20px', background: '#f1f5f9', borderLeft: '3px solid #1e293b', borderRadius: '0 4px 4px 0' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, color: '#475569' }}>Abstract</div>
                          <div style={{ fontSize: 13, lineHeight: 1.7, color: '#334155', textAlign: 'justify' }}>
                            {stripHtml(data.draft.abstract)}
                          </div>
                        </div>
                      )}

                      {['introduction', 'methods', 'results', 'discussion', 'conclusion'].map((key, idx) => {
                        const text = data.draft[key];
                        if (!text) return null;
                        const labels = { introduction: 'Introduction', methods: 'Methods', results: 'Results', discussion: 'Discussion', conclusion: 'Conclusion' };
                        return (
                          <div key={key} style={{ marginBottom: 20 }}>
                            <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>{idx + 1}. {labels[key]}</h4>
                            {stripHtml(text).split(/\n\n+/).filter(p => p.trim().length > 10).map((para, pi) => (
                              <p key={pi} style={{ fontSize: 13, lineHeight: 1.7, color: '#334155', marginBottom: 10, textAlign: 'justify' }}>{para.trim()}</p>
                            ))}
                          </div>
                        );
                      })}

                      {data.draft.references && (
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 16 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>References</h4>
                          {stripHtml(data.draft.references).split(/\n+/).filter(r => r.trim().length > 10).map((ref, ri) => (
                            <p key={ri} style={{ fontSize: 11, color: '#475569', marginBottom: 4, paddingLeft: 20, textIndent: -20, lineHeight: 1.4 }}>
                              [{ri + 1}] {ref.trim()}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Footer */}
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 24, marginTop: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                    This report was generated by <strong>NOVUS</strong> · OrphaNova Labs<br />
                    Data sourced from PubMed, Open Targets, UniProt, PubChem, AlphaFold DB, ClinicalTrials.gov<br />
                    Computational analysis via Anthropic Claude, Tamarind Bio, Modal
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
