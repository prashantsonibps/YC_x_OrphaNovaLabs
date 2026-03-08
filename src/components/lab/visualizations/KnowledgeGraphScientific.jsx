import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../ThemeContext';
import { Button } from '@/components/ui/button';
import { Download, Plus } from 'lucide-react';

/**
 * Scientific Knowledge Graph Visualization
 * Publication-ready disease-gene-drug network with download and export capabilities
 */
export default function KnowledgeGraphScientific({ relations, onAddToPaper }) {
  const { theme } = useTheme();
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const animationRef = useRef(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);

  useEffect(() => {
    if (!relations || relations.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = 1200;
    const height = canvas.height = 800;

    // Build nodes with strategic positioning
    const nodes = [];
    const nodeMap = new Map();
    const diseaseNodes = [];
    const geneNodes = [];
    const drugNodes = [];

    relations.forEach(rel => {
      if (rel.disease && !nodeMap.has(rel.disease)) {
        const node = {
          id: rel.disease,
          type: 'disease',
          x: width * 0.5 + (Math.random() - 0.5) * 80,
          y: height * 0.5 + (Math.random() - 0.5) * 80,
          vx: 0,
          vy: 0,
          connections: 0
        };
        nodes.push(node);
        nodeMap.set(rel.disease, node);
        diseaseNodes.push(node);
      }

      if (rel.gene && !nodeMap.has(rel.gene)) {
        const angle = (geneNodes.length / 10) * Math.PI * 2;
        const radius = 250;
        const node = {
          id: rel.gene,
          type: 'gene',
          x: width * 0.5 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
          y: height * 0.5 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          connections: 0
        };
        nodes.push(node);
        nodeMap.set(rel.gene, node);
        geneNodes.push(node);
      }

      if (rel.drug && !nodeMap.has(rel.drug)) {
        const angle = (drugNodes.length / 10) * Math.PI * 2 + Math.PI / 10;
        const radius = 300;
        const node = {
          id: rel.drug,
          type: 'drug',
          x: width * 0.5 + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
          y: height * 0.5 + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
          vx: 0,
          vy: 0,
          connections: 0
        };
        nodes.push(node);
        nodeMap.set(rel.drug, node);
        drugNodes.push(node);
      }
    });

    // Count connections
    relations.forEach(rel => {
      if (nodeMap.has(rel.disease)) nodeMap.get(rel.disease).connections++;
      if (nodeMap.has(rel.gene)) nodeMap.get(rel.gene).connections++;
      if (nodeMap.has(rel.drug)) nodeMap.get(rel.drug).connections++;
    });

    nodesRef.current = nodes;

    // Static render for publication quality
    const render = () => {
      // White background for publication
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Grid (subtle)
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 0; i < height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Draw connections with varying weights
      relations.forEach(rel => {
        const diseaseNode = nodeMap.get(rel.disease);
        const geneNode = nodeMap.get(rel.gene);
        const drugNode = nodeMap.get(rel.drug);

        // Edge styling based on confidence
        const confidence = rel.confidence || 50;
        const edgeWidth = Math.max(1, confidence / 30);
        const edgeOpacity = Math.min(0.8, confidence / 100);

        ctx.lineWidth = edgeWidth;
        ctx.strokeStyle = `rgba(100, 116, 139, ${edgeOpacity})`;

        if (diseaseNode && geneNode) {
          ctx.beginPath();
          ctx.moveTo(diseaseNode.x, diseaseNode.y);
          ctx.lineTo(geneNode.x, geneNode.y);
          ctx.stroke();

          // Add arrow
          drawArrow(ctx, diseaseNode.x, diseaseNode.y, geneNode.x, geneNode.y);
        }

        if (geneNode && drugNode) {
          ctx.beginPath();
          ctx.moveTo(geneNode.x, geneNode.y);
          ctx.lineTo(drugNode.x, drugNode.y);
          ctx.stroke();

          drawArrow(ctx, geneNode.x, geneNode.y, drugNode.x, drugNode.y);
        }

        if (diseaseNode && drugNode && !geneNode) {
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.moveTo(diseaseNode.x, diseaseNode.y);
          ctx.lineTo(drugNode.x, drugNode.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Draw nodes with scientific styling
      nodes.forEach(node => {
        const size = 10 + Math.min(node.connections * 3, 20);

        // Node shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Node fill
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        
        if (node.type === 'disease') {
          ctx.fillStyle = '#dc2626'; // red
        } else if (node.type === 'gene') {
          ctx.fillStyle = '#2563eb'; // blue
        } else {
          ctx.fillStyle = '#059669'; // green
        }
        ctx.fill();

        // Node border
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner highlight
        ctx.beginPath();
        ctx.arc(node.x - size/4, node.y - size/4, size/3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        // Label with background
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.textAlign = 'center';
        
        const label = node.id.length > 20 ? node.id.substring(0, 18) + '...' : node.id;
        const textWidth = ctx.measureText(label).width;
        
        // Label background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(node.x - textWidth/2 - 4, node.y + size + 4, textWidth + 8, 20);
        
        // Label border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(node.x - textWidth/2 - 4, node.y + size + 4, textWidth + 8, 20);
        
        // Label text
        ctx.fillStyle = '#1e293b';
        ctx.fillText(label, node.x, node.y + size + 18);
      });

      // Legend
      const legendX = width - 180;
      const legendY = 30;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(legendX - 10, legendY - 10, 170, 120);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX - 10, legendY - 10, 170, 120);

      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'left';
      ctx.fillText('Node Types', legendX, legendY);

      const legendItems = [
        { color: '#dc2626', label: 'Disease', y: legendY + 25 },
        { color: '#2563eb', label: 'Gene', y: legendY + 50 },
        { color: '#059669', label: 'Drug/Compound', y: legendY + 75 }
      ];

      legendItems.forEach(item => {
        ctx.beginPath();
        ctx.arc(legendX + 8, item.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '12px Arial';
        ctx.fillText(item.label, legendX + 25, item.y + 4);
      });

      // Title
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText('Disease-Gene-Drug Interaction Network', width / 2, 30);

      // Statistics
      ctx.font = '12px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText(
        `${diseaseNodes.length} Diseases • ${geneNodes.length} Genes • ${drugNodes.length} Drugs • ${relations.length} Interactions`,
        width / 2,
        50
      );

      // Save as data URL
      setImageDataUrl(canvas.toDataURL('image/png'));
    };

    const drawArrow = (ctx, fromX, fromY, toX, toY) => {
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const arrowSize = 8;
      
      ctx.save();
      ctx.translate(toX, toY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-arrowSize, -arrowSize / 2);
      ctx.lineTo(0, 0);
      ctx.lineTo(-arrowSize, arrowSize / 2);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [relations]);

  const handleDownload = () => {
    if (!imageDataUrl) return;
    
    const link = document.createElement('a');
    link.download = 'knowledge-graph-scientific.png';
    link.href = imageDataUrl;
    link.click();
  };

  const handleAddToPaper = () => {
    if (imageDataUrl && onAddToPaper) {
      onAddToPaper(imageDataUrl);
    }
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg border-2 border-slate-300"
        style={{ width: '100%', height: '100%', maxHeight: '600px', objectFit: 'contain' }}
      />
      
      <div className="absolute top-4 left-4 flex gap-2">
        <Button
          onClick={handleDownload}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PNG
        </Button>
        {onAddToPaper && (
          <Button
            onClick={handleAddToPaper}
            size="sm"
            variant="outline"
            className="bg-white/90 hover:bg-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add to Paper
          </Button>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-600 text-center">
        <p>Figure: Disease-gene-drug interaction network showing validated relationships.</p>
        <p className="mt-1">Nodes represent biological entities, edges represent interactions (solid: direct, dashed: indirect).</p>
      </div>
    </div>
  );
}