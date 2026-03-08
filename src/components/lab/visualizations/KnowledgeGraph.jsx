import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../ThemeContext';

/**
 * Knowledge Graph Visualization
 * Displays disease-gene-drug relationships as an interactive graph
 */
export default function KnowledgeGraph({ relations }) {
  const { theme } = useTheme();
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!relations || relations.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;
    
    ctx.scale(2, 2);

    // Build nodes
    const nodes = [];
    const nodeMap = new Map();

    relations.forEach(rel => {
      // Add disease node
      if (rel.disease && !nodeMap.has(rel.disease)) {
        const node = {
          id: rel.disease,
          type: 'disease',
          x: Math.random() * (width/2 - 100) + 50,
          y: Math.random() * (height/2 - 100) + 50,
          vx: 0,
          vy: 0
        };
        nodes.push(node);
        nodeMap.set(rel.disease, node);
      }

      // Add gene node
      if (rel.gene && !nodeMap.has(rel.gene)) {
        const node = {
          id: rel.gene,
          type: 'gene',
          x: Math.random() * (width/2 - 100) + 50,
          y: Math.random() * (height/2 - 100) + 50,
          vx: 0,
          vy: 0
        };
        nodes.push(node);
        nodeMap.set(rel.gene, node);
      }

      // Add drug node
      if (rel.drug && !nodeMap.has(rel.drug)) {
        const node = {
          id: rel.drug,
          type: 'drug',
          x: Math.random() * (width/2 - 100) + 50,
          y: Math.random() * (height/2 - 100) + 50,
          vx: 0,
          vy: 0
        };
        nodes.push(node);
        nodeMap.set(rel.drug, node);
      }
    });

    nodesRef.current = nodes;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width/2, height/2);

      // Apply forces
      nodes.forEach(node => {
        // Center force
        const centerX = width/4;
        const centerY = height/4;
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          node.vx += (dx / distance) * 0.01;
          node.vy += (dy / distance) * 0.01;
        }

        // Repulsion between nodes
        nodes.forEach(other => {
          if (node === other) return;
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100 && distance > 0) {
            const force = (100 - distance) / 100;
            node.vx -= (dx / distance) * force * 0.5;
            node.vy -= (dy / distance) * force * 0.5;
          }
        });

        // Apply velocity
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;

        // Boundaries
        node.x = Math.max(30, Math.min(width/2 - 30, node.x));
        node.y = Math.max(30, Math.min(height/2 - 30, node.y));
      });

      // Draw connections
      ctx.strokeStyle = theme === 'dark' ? 'rgba(100, 116, 139, 0.3)' : 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1;
      
      relations.forEach(rel => {
        const diseaseNode = nodeMap.get(rel.disease);
        const geneNode = nodeMap.get(rel.gene);
        const drugNode = nodeMap.get(rel.drug);

        if (diseaseNode && geneNode) {
          ctx.beginPath();
          ctx.moveTo(diseaseNode.x, diseaseNode.y);
          ctx.lineTo(geneNode.x, geneNode.y);
          ctx.stroke();
        }

        if (geneNode && drugNode) {
          ctx.beginPath();
          ctx.moveTo(geneNode.x, geneNode.y);
          ctx.lineTo(drugNode.x, drugNode.y);
          ctx.stroke();
        }

        if (diseaseNode && drugNode) {
          ctx.beginPath();
          ctx.moveTo(diseaseNode.x, diseaseNode.y);
          ctx.lineTo(drugNode.x, drugNode.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        
        if (node.type === 'disease') {
          ctx.fillStyle = '#ef4444'; // red
        } else if (node.type === 'gene') {
          ctx.fillStyle = '#3b82f6'; // blue
        } else {
          ctx.fillStyle = '#10b981'; // green
        }
        
        ctx.fill();

        // Label
        ctx.fillStyle = theme === 'dark' ? '#e2e8f0' : '#1e293b';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(node.id.length > 15 ? node.id.substring(0, 12) + '...' : node.id, node.x, node.y - 12);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [relations, theme]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute top-4 right-4 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Disease</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Gene</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Drug</span>
        </div>
      </div>
    </div>
  );
}