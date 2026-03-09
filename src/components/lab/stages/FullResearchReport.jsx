import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Loader2, X, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Literature, Relation, Hypothesis, Experiment, Draft } from '@/api/entities';
import { Core } from '@/api/integrationsClient';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const AF_CACHE_PREFIX = 'orphanova_alphafold_';
function getCachedAlphaFold(geneName) {
  if (!geneName) return null;
  try {
    return JSON.parse(localStorage.getItem(`${AF_CACHE_PREFIX}${geneName.toUpperCase()}`));
  } catch { return null; }
}

function strip(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

async function fetchDiseaseImages(diseaseName) {
  if (!diseaseName) return [];
  try {
    const q = encodeURIComponent(diseaseName);
    const res = await fetch(`https://openi.nlm.nih.gov/api/search?query=${q}&it=xg,cg,ph&m=1&n=4`);
    const data = await res.json();
    return (data.list || []).slice(0, 4).map(img => ({
      url: `https://openi.nlm.nih.gov${img.imgLarge || img.imgThumb}`,
      caption: (img.title || '').slice(0, 120),
      source: img.journal || 'NLM Open-i',
    }));
  } catch { return []; }
}

export default function FullResearchReport({ project, visible, onClose }) {
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState(null);
  const [execSummary, setExecSummary] = useState(null);
  const [images, setImages] = useState([]);

  const loadAllData = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    try {
      const [literature, relations, hypotheses, experiments, drafts] = await Promise.all([
        Literature.filter({ project_id: project.id }),
        Relation.filter({ project_id: project.id }),
        Hypothesis.filter({ project_id: project.id }),
        Experiment.filter({ project_id: project.id }),
        Draft.filter({ project_id: project.id }),
      ]);

      fetchDiseaseImages(project.disease_name).then(imgs => setImages(imgs));

      const validRelations = relations.filter(r => r.status === 'valid');
      const genes = [];
      const seen = new Set();
      for (const r of validRelations) {
        if (r.gene && r.gene !== 'N/A' && !seen.has(r.gene)) {
          seen.add(r.gene);
          genes.push({
            name: r.gene, otScore: r.ot_score,
            uniprotDesc: r.uniprot?.function || r.uniprot?.protein_name || '',
            accession: r.uniprot?.accession || '',
            alphafold: getCachedAlphaFold(r.gene),
          });
        }
      }

      const drugs = [];
      const drugSeen = new Set();
      for (const r of validRelations) {
        if (r.drug && r.drug !== 'N/A' && !drugSeen.has(r.drug)) {
          drugSeen.add(r.drug);
          drugs.push({ name: r.drug, confidence: r.confidence });
        }
      }

      const loaded = {
        literature: literature.filter(l => l.selected),
        relations: validRelations,
        hypotheses: hypotheses.filter(h => h.status === 'approved'),
        experiments,
        draft: drafts[0] || null,
        genes,
        drugs: drugs.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)),
      };
      setData(loaded);

      try {
        const summary = await Core.InvokeLLM({
          prompt: `Write 4 bullet points (each 1 sentence) summarizing the key findings of research on "${project.disease_name}".
Data: ${loaded.literature.length} papers, ${validRelations.length} validated relationships, genes: ${genes.map(g => g.name).join(', ')}, drugs: ${drugs.map(d => d.name).join(', ')}, ${loaded.hypotheses.length} hypotheses, ${loaded.experiments.length} experiments.
Return JSON: { "bullets": ["...", "...", "...", "..."] }`,
          response_json_schema: { type: "object", properties: { bullets: { type: "array", items: { type: "string" } } } }
        });
        setExecSummary(summary.bullets || []);
      } catch {
        setExecSummary([
          `Analyzed ${loaded.literature.length} papers on ${project.disease_name}`,
          `Identified ${genes.length} gene targets with validated relationships`,
          `${loaded.hypotheses.length} testable hypotheses generated from evidence`,
          `${loaded.experiments.length} experiment designs proposed`,
        ]);
      }
    } catch (err) {
      console.error('Report load error:', err);
    } finally {
      setLoading(false);
    }
  }, [project, visible]);

  useEffect(() => { loadAllData(); }, [loadAllData]);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const el = reportRef.current;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = pdfW / canvas.width;
      const scaledH = canvas.height * ratio;
      let pos = 0, remaining = scaledH;
      while (remaining > 0) {
        if (pos > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -pos, pdfW, scaledH);
        pos += pdfH; remaining -= pdfH;
      }
      pdf.save(`${(project.disease_name || 'research').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_research_report.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setExporting(false);
    }
  };

  if (!visible) return null;

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const S = { section: { marginBottom: 36 }, h2: { fontSize: 18, fontWeight: 700, paddingBottom: 6, marginBottom: 14, borderBottom: '2px solid' }, th: { padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 12, borderBottom: '2px solid #e2e8f0' }, td: { padding: '8px 10px', fontSize: 12, borderBottom: '1px solid #f1f5f9' } };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">Full Research Report</h3>
        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadPDF} disabled={loading || exporting || !data} className="bg-blue-600 hover:bg-blue-700">
            {exporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</> : <><Download className="w-4 h-4 mr-2" />Download PDF</>}
          </Button>
          <Button onClick={onClose} variant="outline" size="sm" className="border-slate-700 text-slate-400">
            <ChevronUp className="w-4 h-4 mr-1" /> Collapse
          </Button>
        </div>
      </div>

      {/* Report body */}
      <div className="rounded-lg overflow-hidden border border-slate-600 shadow-xl" style={{ maxHeight: '80vh', overflowY: 'auto', background: '#fff' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
            <p className="text-slate-500 text-sm">Compiling report from all stages...</p>
          </div>
        ) : data ? (
          <div ref={reportRef} style={{ fontFamily: "'Inter','Helvetica',sans-serif", color: '#1e293b', background: '#fff' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', padding: '40px 48px', color: '#fff' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.6, marginBottom: 10 }}>Research Report</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>{project.disease_name}</h1>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{today} · Generated by NOVUS · OrphaNova Research</div>
            </div>

            <div style={{ padding: '36px 48px' }}>

              {/* Executive Summary */}
              <section style={S.section}>
                <h2 style={{ ...S.h2, borderColor: '#0ea5e9' }}>Executive Summary</h2>
                {(execSummary || []).map((b, i) => (
                  <div key={i} style={{ padding: '8px 16px', borderLeft: '3px solid #0ea5e9', marginBottom: 8, fontSize: 13, lineHeight: 1.6, background: '#f8fafc' }}>{b}</div>
                ))}
              </section>

              {/* Stats */}
              <section style={S.section}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                  {[
                    { v: data.literature.length, l: 'Papers', c: '#0ea5e9' },
                    { v: data.relations.length, l: 'Targets', c: '#4f46e5' },
                    { v: data.hypotheses.length, l: 'Hypotheses', c: '#f59e0b' },
                    { v: data.experiments.length, l: 'Experiments', c: '#dc2626' },
                  ].map((s, i) => (
                    <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px', textAlign: 'center', borderTop: `3px solid ${s.c}` }}>
                      <div style={{ fontSize: 26, fontWeight: 800 }}>{s.v}</div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Images */}
              {images.length > 0 && (
                <section style={S.section}>
                  <h2 style={{ ...S.h2, borderColor: '#8b5cf6' }}>Research Imagery</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                    {images.map((img, i) => (
                      <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fafafa' }}>
                        <img src={img.url} alt={img.caption} crossOrigin="anonymous" style={{ width: '100%', height: 180, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                        <div style={{ padding: '8px 12px' }}>
                          <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>{img.caption}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Source: {img.source}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Gene Targets */}
              {data.genes.length > 0 && (
                <section style={S.section}>
                  <h2 style={{ ...S.h2, borderColor: '#4f46e5' }}>Validated Gene Targets</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      <th style={S.th}>Gene</th>
                      <th style={{ ...S.th, textAlign: 'center' }}>OpenTargets</th>
                      <th style={S.th}>Description</th>
                      <th style={{ ...S.th, textAlign: 'center' }}>AlphaFold</th>
                    </tr></thead>
                    <tbody>
                      {data.genes.map((g, i) => (
                        <tr key={i}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{g.name}</td>
                          <td style={{ ...S.td, textAlign: 'center' }}>
                            {g.otScore != null ? (
                              <span style={{ background: g.otScore >= 0.5 ? '#dcfce7' : '#fef3c7', color: g.otScore >= 0.5 ? '#166534' : '#92400e', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>
                                {typeof g.otScore === 'number' ? g.otScore.toFixed(3) : g.otScore}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ ...S.td, color: '#475569', maxWidth: 260 }}>{g.uniprotDesc ? g.uniprotDesc.slice(0, 100) + (g.uniprotDesc.length > 100 ? '...' : '') : '—'}</td>
                          <td style={{ ...S.td, textAlign: 'center' }}>
                            {g.alphafold?.status === 'completed' ? (
                              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600 }}>Available</span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* Drug Candidates */}
              {data.drugs.length > 0 && (
                <section style={S.section}>
                  <h2 style={{ ...S.h2, borderColor: '#059669' }}>Drug Candidates</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: '#f8fafc' }}>
                      <th style={{ ...S.th, width: 40, textAlign: 'center' }}>#</th>
                      <th style={S.th}>Drug</th>
                      <th style={{ ...S.th, textAlign: 'center' }}>Confidence</th>
                    </tr></thead>
                    <tbody>
                      {data.drugs.map((d, i) => (
                        <tr key={i}>
                          <td style={{ ...S.td, textAlign: 'center', fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ ...S.td, fontWeight: 500 }}>{d.name}</td>
                          <td style={{ ...S.td, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 60, height: 5, background: '#e2e8f0', borderRadius: 3 }}>
                                <div style={{ width: `${d.confidence || 0}%`, height: '100%', background: '#059669', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600 }}>{d.confidence || 0}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}

              {/* Hypotheses */}
              {data.hypotheses.length > 0 && (
                <section style={S.section}>
                  <h2 style={{ ...S.h2, borderColor: '#f59e0b' }}>Approved Hypotheses</h2>
                  {data.hypotheses.map((h, i) => (
                    <div key={i} style={{ border: '1px solid #fde68a', borderRadius: 8, padding: '14px 18px', marginBottom: 10, background: '#fffbeb' }}>
                      <div style={{ fontSize: 11, color: '#92400e', fontWeight: 600, marginBottom: 2 }}>Hypothesis {i + 1}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{h.title}</div>
                    </div>
                  ))}
                </section>
              )}

              {/* Top Experiments */}
              {data.experiments.length > 0 && (
                <section style={S.section}>
                  <h2 style={{ ...S.h2, borderColor: '#dc2626' }}>Top Experiment Designs</h2>
                  {data.experiments
                    .sort((a, b) => ((b.feasibility_score || 0) + (b.impact_score || 0)) - ((a.feasibility_score || 0) + (a.impact_score || 0)))
                    .slice(0, 3).map((exp, i) => (
                    <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '16px 20px', marginBottom: 12, background: '#fafafa' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>{exp.type || 'experiment'}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{exp.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
                        {strip(exp.description || '').slice(0, 200)}{(exp.description || '').length > 200 ? '...' : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 20 }}>
                        {[{ l: 'Feasibility', v: exp.feasibility_score }, { l: 'Impact', v: exp.impact_score }, { l: 'Novelty', v: exp.novelty_score }].map((s, j) => (
                          <div key={j} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: '#64748b' }}>{s.l}</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: s.v >= 4 ? '#059669' : s.v >= 3 ? '#f59e0b' : '#94a3b8' }}>{s.v || '—'}<span style={{ fontSize: 10, fontWeight: 400 }}>/5</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Paper */}
              {data.draft && (
                <section style={S.section}>
                  <h2 style={{ ...S.h2, borderColor: '#6366f1' }}>Research Paper</h2>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '28px 36px', background: '#fafafa' }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, textAlign: 'center', marginBottom: 6, lineHeight: 1.3 }}>{strip(data.draft.title)}</h3>
                    <p style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginBottom: 20 }}>OrphaNova Research · {today}</p>
                    {data.draft.abstract && (
                      <div style={{ margin: '0 20px 20px', padding: '14px 18px', background: '#f1f5f9', borderLeft: '3px solid #1e293b', borderRadius: '0 4px 4px 0' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, color: '#475569' }}>Abstract</div>
                        <div style={{ fontSize: 12, lineHeight: 1.7, color: '#334155', textAlign: 'justify' }}>{strip(data.draft.abstract)}</div>
                      </div>
                    )}
                    {['introduction', 'methods', 'results', 'discussion', 'conclusion'].map((key, idx) => {
                      const text = data.draft[key];
                      if (!text) return null;
                      return (
                        <div key={key} style={{ marginBottom: 16 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>{idx + 1}. {key.charAt(0).toUpperCase() + key.slice(1)}</h4>
                          {strip(text).split(/\n\n+/).filter(p => p.trim().length > 10).map((p, pi) => (
                            <p key={pi} style={{ fontSize: 12, lineHeight: 1.7, color: '#334155', marginBottom: 8, textAlign: 'justify' }}>{p.trim()}</p>
                          ))}
                        </div>
                      );
                    })}
                    {data.draft.references && (
                      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 12 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>References</h4>
                        {strip(data.draft.references).split(/\n+/).filter(r => r.trim().length > 10).map((r, ri) => (
                          <p key={ri} style={{ fontSize: 10, color: '#475569', marginBottom: 3, paddingLeft: 16, textIndent: -16, lineHeight: 1.3 }}>[{ri + 1}] {r.trim()}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Footer */}
              <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.6 }}>
                  Generated by <strong>NOVUS</strong> · OrphaNova Labs<br />
                  Data: PubMed, Open Targets, UniProt, PubChem, AlphaFold DB, ClinicalTrials.gov<br />
                  Compute: Anthropic Claude, Tamarind Bio, Modal
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
