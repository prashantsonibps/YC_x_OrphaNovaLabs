import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { useTheme } from '../../ThemeContext';
import { Maximize2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

function buildElements(relations, diseaseName) {
  const nodeSet = new Map();
  const edges = [];

  const ensureNode = (id, type, extra = {}) => {
    if (!id || id === 'N/A') return null;
    const key = `${type}::${id}`;
    if (!nodeSet.has(key)) {
      nodeSet.set(key, { data: { id: key, label: id, type, ...extra } });
    } else {
      const existing = nodeSet.get(key);
      Object.assign(existing.data, extra);
    }
    return key;
  };

  const diseaseKey = ensureNode(diseaseName || 'Disease', 'disease');

  for (const rel of relations) {
    if (rel.status === 'rejected') continue;

    const dKey = ensureNode(rel.disease || diseaseName, 'disease');
    const gKey = rel.gene ? ensureNode(rel.gene, 'gene', {
      otScore: rel.ot_score,
      uniprotDesc: rel.uniprot?.function || '',
      uniprotName: rel.uniprot?.protein_name || '',
      accession: rel.uniprot?.accession || '',
    }) : null;
    const drugKey = (rel.drug && rel.drug !== 'N/A')
      ? ensureNode(rel.drug, 'drug')
      : null;

    const validated = rel.status === 'valid';
    const confidence = rel.confidence || 50;

    if (dKey && gKey) {
      edges.push({
        data: {
          id: `e-${dKey}-${gKey}-${rel.id}`,
          source: dKey,
          target: gKey,
          edgeType: 'disease-gene',
          label: (rel.relationship_type || '').replace(/_/g, ' '),
          confidence,
          validated,
          evidence: rel.evidence || '',
        }
      });
    }

    if (gKey && drugKey) {
      edges.push({
        data: {
          id: `e-${gKey}-${drugKey}-${rel.id}`,
          source: gKey,
          target: drugKey,
          edgeType: 'gene-drug',
          label: rel.drug,
          confidence,
          validated,
          evidence: rel.evidence || '',
        }
      });
    }
  }

  return [...nodeSet.values(), ...edges];
}

const CYTOSCAPE_STYLE = [
  // --- Disease nodes ---
  {
    selector: 'node[type="disease"]',
    style: {
      'background-color': '#DC2626',
      'width': 80,
      'height': 80,
      'label': 'data(label)',
      'color': '#fff',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '11px',
      'font-weight': 700,
      'text-wrap': 'wrap',
      'text-max-width': '70px',
      'border-width': 3,
      'border-color': '#991B1B',
      'text-outline-width': 0,
      'overlay-padding': 6,
    }
  },
  // --- Gene nodes ---
  {
    selector: 'node[type="gene"]',
    style: {
      'background-color': '#4F46E5',
      'width': 60,
      'height': 60,
      'label': 'data(label)',
      'color': '#fff',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '10px',
      'font-weight': 600,
      'text-wrap': 'wrap',
      'text-max-width': '55px',
      'border-width': 2,
      'border-color': '#3730A3',
      'overlay-padding': 5,
    }
  },
  // --- Drug nodes ---
  {
    selector: 'node[type="drug"]',
    style: {
      'background-color': '#059669',
      'width': 50,
      'height': 50,
      'label': 'data(label)',
      'color': '#fff',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': '9px',
      'font-weight': 600,
      'text-wrap': 'wrap',
      'text-max-width': '45px',
      'border-width': 2,
      'border-color': '#065F46',
      'overlay-padding': 4,
    }
  },
  // --- Unvalidated nodes: dashed + faded ---
  {
    selector: 'node[!validated]',
    style: {
      'opacity': 0.6,
      'border-style': 'dashed',
    }
  },
  // --- Validated glow ---
  {
    selector: 'node[validated]',
    style: {
      'opacity': 1,
      'border-style': 'solid',
      'shadow-blur': 12,
      'shadow-color': 'rgba(99,102,241,0.4)',
      'shadow-opacity': 0.6,
      'shadow-offset-x': 0,
      'shadow-offset-y': 0,
    }
  },
  // --- Disease→Gene edges ---
  {
    selector: 'edge[edgeType="disease-gene"]',
    style: {
      'line-color': '#6366F1',
      'target-arrow-color': '#6366F1',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.2,
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '8px',
      'color': '#94A3B8',
      'text-rotation': 'autorotate',
      'text-background-color': '#0F172A',
      'text-background-opacity': 0.85,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
    }
  },
  // --- Gene→Drug edges ---
  {
    selector: 'edge[edgeType="gene-drug"]',
    style: {
      'line-color': '#10B981',
      'target-arrow-color': '#10B981',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1,
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '7px',
      'color': '#94A3B8',
      'text-rotation': 'autorotate',
      'text-background-color': '#0F172A',
      'text-background-opacity': 0.85,
      'text-background-padding': '2px',
      'text-background-shape': 'roundrectangle',
    }
  },
  // --- Unvalidated edges ---
  {
    selector: 'edge[!validated]',
    style: { 'opacity': 0.4, 'line-style': 'dashed' }
  },
  {
    selector: 'edge[validated]',
    style: { 'opacity': 0.85, 'line-style': 'solid' }
  },
  // --- Dimmed state for click-to-highlight ---
  {
    selector: '.dimmed',
    style: { 'opacity': 0.12 }
  },
  {
    selector: '.highlighted',
    style: {
      'opacity': 1,
      'z-index': 999,
      'shadow-blur': 18,
      'shadow-color': 'rgba(99,102,241,0.6)',
      'shadow-opacity': 1,
    }
  },
  {
    selector: '.highlighted-edge',
    style: { 'opacity': 1, 'width': 4, 'z-index': 998 }
  },
];

function makeLayout() {
  return {
    name: 'breadthfirst',
    directed: true,
    spacingFactor: 1.5,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
    padding: 40,
  };
}

export default function KnowledgeGraphScientific({ relations, diseaseName, onAddToPaper }) {
  const { theme } = useTheme();
  const cyRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const elements = useMemo(() => {
    if (!relations || relations.length === 0) return [];

    const visible = relations.filter(r => r.status !== 'rejected');
    if (visible.length === 0) return [];

    const els = buildElements(visible, diseaseName);

    els.forEach(el => {
      if (el.data && !el.data.source) {
        const nodeRels = visible.filter(r => {
          const key = `${el.data.type}::${el.data.label}`;
          return key === el.data.id && r.status === 'valid';
        });
        el.data.validated = nodeRels.length > 0 || visible.some(r => {
          if (el.data.type === 'disease') return r.disease === el.data.label && r.status === 'valid';
          if (el.data.type === 'gene') return r.gene === el.data.label && r.status === 'valid';
          if (el.data.type === 'drug') return r.drug === el.data.label && r.status === 'valid';
          return false;
        });
      }
    });

    els.forEach(el => {
      if (el.data?.confidence) {
        el.style = { width: Math.max(1.5, (el.data.confidence / 100) * 4) };
      }
    });

    return els;
  }, [relations, diseaseName]);

  const handleCyReady = useCallback((cy) => {
    cyRef.current = cy;

    cy.on('mouseover', 'node', (e) => {
      const node = e.target;
      const d = node.data();
      const pos = e.renderedPosition || e.position;

      let html = `<div class="font-semibold text-sm mb-1">${d.label}</div>`;
      html += `<div class="text-xs opacity-70 mb-1 capitalize">${d.type}</div>`;

      if (d.type === 'gene') {
        if (d.otScore != null) html += `<div class="text-xs">Open Targets: <span class="font-semibold">${typeof d.otScore === 'number' ? d.otScore.toFixed(3) : d.otScore}</span></div>`;
        if (d.uniprotName) html += `<div class="text-xs mt-1">${d.uniprotName}</div>`;
        if (d.uniprotDesc) html += `<div class="text-xs opacity-70 mt-0.5" style="max-width:250px">${d.uniprotDesc.slice(0, 180)}${d.uniprotDesc.length > 180 ? '...' : ''}</div>`;
      }

      setTooltip({ x: pos.x, y: pos.y, html });
    });

    cy.on('mouseover', 'edge', (e) => {
      const edge = e.target;
      const d = edge.data();
      const pos = e.renderedPosition || { x: e.position?.x, y: e.position?.y };

      let html = `<div class="font-semibold text-xs mb-1">${d.label || d.edgeType}</div>`;
      html += `<div class="text-xs">Confidence: ${d.confidence}%</div>`;
      if (d.evidence) html += `<div class="text-xs opacity-70 mt-1 italic" style="max-width:250px">"${d.evidence.slice(0, 200)}${d.evidence.length > 200 ? '...' : ''}"</div>`;

      setTooltip({ x: pos.x || 0, y: pos.y || 0, html });
    });

    cy.on('mouseout', 'node, edge', () => setTooltip(null));

    cy.on('tap', 'node[type="gene"]', (e) => {
      const tapped = e.target;
      cy.elements().addClass('dimmed');
      tapped.removeClass('dimmed').addClass('highlighted');
      tapped.connectedEdges().removeClass('dimmed').addClass('highlighted-edge');
      tapped.neighborhood().nodes().removeClass('dimmed').addClass('highlighted');
    });

    cy.on('tap', 'node[type="disease"]', () => {
      cy.elements().removeClass('dimmed highlighted highlighted-edge');
    });

    cy.on('tap', (e) => {
      if (e.target === cy) {
        cy.elements().removeClass('dimmed highlighted highlighted-edge');
        setTooltip(null);
      }
    });

    cy.layout(makeLayout()).run();
    cy.fit(undefined, 40);
  }, []);

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.elements().removeClass('dimmed highlighted highlighted-edge');
      cyRef.current.fit(undefined, 40);
    }
  };

  const hasContent = elements.length > 0;

  return (
    <div className="relative w-full" style={{ minHeight: 500 }}>
      {!hasContent ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-3">
          <Database className={`w-12 h-12 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
          <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            Validate relationships above to build the knowledge graph
          </p>
        </div>
      ) : (
        <>
          <CytoscapeComponent
            elements={elements}
            stylesheet={CYTOSCAPE_STYLE}
            layout={makeLayout()}
            cy={handleCyReady}
            style={{
              width: '100%',
              height: '100%',
              minHeight: 500,
              background: theme === 'dark' ? '#0F172A' : '#F8FAFC',
              borderRadius: '0.5rem',
            }}
            minZoom={0.3}
            maxZoom={3}
            wheelSensitivity={0.3}
          />

          {/* Fit button */}
          <Button
            onClick={handleFit}
            size="sm"
            variant="outline"
            className={`absolute top-3 right-3 z-10 ${
              theme === 'dark'
                ? 'bg-slate-800/80 border-slate-600 hover:bg-slate-700 text-slate-300'
                : 'bg-white/80 border-slate-300 hover:bg-white text-slate-700'
            }`}
          >
            <Maximize2 className="w-4 h-4 mr-1" />
            Fit
          </Button>

          {/* Legend */}
          <div className={`absolute bottom-3 left-3 z-10 p-3 rounded-lg text-xs space-y-1.5 ${
            theme === 'dark'
              ? 'bg-slate-900/90 border border-slate-700 text-slate-300'
              : 'bg-white/90 border border-slate-200 text-slate-700'
          }`}>
            <div className="font-semibold mb-1.5">Legend</div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-[#DC2626]" />
              Disease
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-[#4F46E5]" />
              Gene
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-[#059669]" />
              Drug
            </div>
            <div className={`border-t pt-1.5 mt-1.5 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-slate-400 border-2 border-slate-500" />
                Validated
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <span className="inline-block w-3 h-3 rounded-full bg-slate-400 border-2 border-dashed border-slate-500" />
                Uncertain
              </div>
            </div>
          </div>

          {/* Tooltip */}
          {tooltip && (
            <div
              ref={tooltipRef}
              className={`absolute z-50 pointer-events-none px-3 py-2 rounded-lg shadow-lg max-w-xs ${
                theme === 'dark'
                  ? 'bg-slate-800 border border-slate-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-900'
              }`}
              style={{
                left: Math.min(tooltip.x + 12, (typeof window !== 'undefined' ? window.innerWidth - 300 : 600)),
                top: tooltip.y - 10,
              }}
              dangerouslySetInnerHTML={{ __html: tooltip.html }}
            />
          )}
        </>
      )}
    </div>
  );
}
