'use client';

import { useEffect, useRef, useState } from 'react';

interface StructureRendererProps {
  smiles: string;
  width?: number;
  height?: number;
  className?: string;
}

interface Atom {
  element: string;
  x: number;
  y: number;
  bonds: Bond[];
}

interface Bond {
  type: number; // 1=single, 2=double, 3=triple
  to: number; // atom index
}

export function StructureRenderer({ smiles, width = 300, height = 200, className = '' }: StructureRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!canvasRef.current || !smiles) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      setError('');

      // Parse SMILES and draw structure
      drawStructure(ctx, smiles, width, height);
    } catch (err) {
      console.error('Error rendering structure:', err);
      setError('Could not render structure');
    }
  }, [smiles, width, height]);

  const drawStructure = (ctx: CanvasRenderingContext2D, smiles: string, width: number, height: number) => {
    // Set up canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1f2937';
    ctx.fillStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = width / 2;
    const centerY = height / 2;

    // Simple structure rendering for common molecules
    const structures: { [key: string]: () => void } = {
      // Aspirin-like structure
      'CC(=O)Oc1ccccc1C(=O)O': () => drawAspirin(ctx, centerX, centerY),
      // Benzene ring
      'c1ccccc1': () => drawBenzene(ctx, centerX, centerY),
      // Ethanol
      'CCO': () => drawEthanol(ctx, centerX, centerY),
      // Acetic Acid
      'CC(=O)O': () => drawAceticAcid(ctx, centerX, centerY),
      // Caffeine
      'CN1C=NC2=C1C(=O)N(C(=O)N2C)C': () => drawCaffeine(ctx, centerX, centerY),
      // Water
      'O': () => drawWater(ctx, centerX, centerY),
      // Methane
      'C': () => drawMethane(ctx, centerX, centerY),
      // Glucose
      'C(C1C(C(C(C(O1)O)O)O)O)O': () => drawGlucose(ctx, centerX, centerY),
    };

    if (structures[smiles]) {
      structures[smiles]();
    } else {
      // Generic fallback - draw molecular formula
      drawGenericMolecule(ctx, smiles, centerX, centerY);
    }
  };

  const drawAtom = (ctx: CanvasRenderingContext2D, x: number, y: number, element: string) => {
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 2 * Math.PI);
    ctx.fillStyle = getAtomColor(element);
    ctx.fill();
    ctx.strokeStyle = '#374151';
    ctx.stroke();
    
    ctx.fillStyle = getTextColor(element);
    ctx.fillText(element, x, y);
  };

  const drawBond = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, type: number = 1) => {
    ctx.strokeStyle = '#4b5563';
    
    if (type === 1) {
      // Single bond
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (type === 2) {
      // Double bond
      ctx.lineWidth = 1;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const offset = 3;
      
      const perpX = -dy / length * offset;
      const perpY = dx / length * offset;
      
      ctx.beginPath();
      ctx.moveTo(x1 + perpX, y1 + perpY);
      ctx.lineTo(x2 + perpX, y2 + perpY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x1 - perpX, y1 - perpY);
      ctx.lineTo(x2 - perpX, y2 - perpY);
      ctx.stroke();
    }
  };

  const getAtomColor = (element: string): string => {
    const colors: { [key: string]: string } = {
      'C': '#cbd5e1', // Gray for carbon
      'H': '#e2e8f0', // Light gray for hydrogen
      'O': '#fecaca', // Red for oxygen
      'N': '#bfdbfe', // Blue for nitrogen
      'S': '#fef3c7', // Yellow for sulfur
      'P': '#fed7aa', // Orange for phosphorus
      'F': '#bbf7d0', // Green for fluorine
      'Cl': '#bbf7d0', // Green for chlorine
      'Br': '#d946ef', // Purple for bromine
      'I': '#a855f7', // Violet for iodine
    };
    return colors[element] || '#d1d5db';
  };

  const getTextColor = (element: string): string => {
    return '#1f2937'; // Dark gray for text
  };

  // Specific molecule drawings
  const drawAspirin = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    // Benzene ring
    const ringRadius = 25;
    const ringAtoms = [
      { x: centerX, y: centerY - ringRadius, element: 'C' },
      { x: centerX + ringRadius * 0.87, y: centerY - ringRadius * 0.5, element: 'C' },
      { x: centerX + ringRadius * 0.87, y: centerY + ringRadius * 0.5, element: 'C' },
      { x: centerX, y: centerY + ringRadius, element: 'C' },
      { x: centerX - ringRadius * 0.87, y: centerY + ringRadius * 0.5, element: 'C' },
      { x: centerX - ringRadius * 0.87, y: centerY - ringRadius * 0.5, element: 'C' },
    ];

    // Draw benzene ring bonds
    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      drawBond(ctx, ringAtoms[i].x, ringAtoms[i].y, ringAtoms[next].x, ringAtoms[next].y, 1.5); // Aromatic bond
    }

    // Draw atoms
    ringAtoms.forEach(atom => drawAtom(ctx, atom.x, atom.y, atom.element));

    // Carboxyl groups
    drawAtom(ctx, centerX - 50, centerY, 'C');
    drawAtom(ctx, centerX - 70, centerY, 'O');
    drawAtom(ctx, centerX - 50, centerY - 20, 'O');
    
    drawBond(ctx, centerX - ringRadius * 0.87, centerY - ringRadius * 0.5, centerX - 50, centerY, 1);
    drawBond(ctx, centerX - 50, centerY, centerX - 70, centerY, 2);
    drawBond(ctx, centerX - 50, centerY, centerX - 50, centerY - 20, 1);

    // Ester group
    drawAtom(ctx, centerX + 50, centerY - ringRadius, 'C');
    drawAtom(ctx, centerX + 70, centerY - ringRadius, 'O');
    drawAtom(ctx, centerX + 50, centerY - ringRadius - 25, 'O');
    drawAtom(ctx, centerX + 50, centerY - ringRadius - 40, 'C');
    
    drawBond(ctx, centerX, centerY - ringRadius, centerX + 50, centerY - ringRadius, 1);
    drawBond(ctx, centerX + 50, centerY - ringRadius, centerX + 70, centerY - ringRadius, 2);
    drawBond(ctx, centerX + 50, centerY - ringRadius, centerX + 50, centerY - ringRadius - 25, 1);
    drawBond(ctx, centerX + 50, centerY - ringRadius - 25, centerX + 50, centerY - ringRadius - 40, 1);
  };

  const drawBenzene = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    const radius = 30;
    const atoms = [
      { x: centerX, y: centerY - radius, element: 'C' },
      { x: centerX + radius * 0.87, y: centerY - radius * 0.5, element: 'C' },
      { x: centerX + radius * 0.87, y: centerY + radius * 0.5, element: 'C' },
      { x: centerX, y: centerY + radius, element: 'C' },
      { x: centerX - radius * 0.87, y: centerY + radius * 0.5, element: 'C' },
      { x: centerX - radius * 0.87, y: centerY - radius * 0.5, element: 'C' },
    ];

    // Draw circle inside for aromatic ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw bonds
    for (let i = 0; i < 6; i++) {
      const next = (i + 1) % 6;
      drawBond(ctx, atoms[i].x, atoms[i].y, atoms[next].x, atoms[next].y, 1);
    }

    // Draw atoms
    atoms.forEach(atom => drawAtom(ctx, atom.x, atom.y, atom.element));
  };

  const drawEthanol = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    const atoms = [
      { x: centerX - 20, y: centerY, element: 'C' },
      { x: centerX, y: centerY, element: 'C' },
      { x: centerX + 25, y: centerY, element: 'O' },
    ];

    drawBond(ctx, atoms[0].x, atoms[0].y, atoms[1].x, atoms[1].y, 1);
    drawBond(ctx, atoms[1].x, atoms[1].y, atoms[2].x, atoms[2].y, 1);

    atoms.forEach(atom => drawAtom(ctx, atom.x, atom.y, atom.element));

    // Hydrogens
    drawAtom(ctx, centerX - 20, centerY - 20, 'H');
    drawAtom(ctx, centerX - 20, centerY + 20, 'H');
    drawAtom(ctx, centerX - 40, centerY, 'H');
    drawAtom(ctx, centerX + 10, centerY - 20, 'H');
    drawAtom(ctx, centerX + 10, centerY + 20, 'H');
    drawAtom(ctx, centerX + 40, centerY, 'H');

    drawBond(ctx, centerX - 20, centerY, centerX - 20, centerY - 20, 1);
    drawBond(ctx, centerX - 20, centerY, centerX - 20, centerY + 20, 1);
    drawBond(ctx, centerX - 20, centerY, centerX - 40, centerY, 1);
    drawBond(ctx, centerX, centerY, centerX + 10, centerY - 20, 1);
    drawBond(ctx, centerX, centerY, centerX + 10, centerY + 20, 1);
    drawBond(ctx, centerX + 25, centerY, centerX + 40, centerY, 1);
  };

  const drawAceticAcid = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    const atoms = [
      { x: centerX - 20, y: centerY, element: 'C' },
      { x: centerX + 10, y: centerY, element: 'C' },
      { x: centerX + 35, y: centerY, element: 'O' },
      { x: centerX + 10, y: centerY - 25, element: 'O' },
    ];

    drawBond(ctx, atoms[0].x, atoms[0].y, atoms[1].x, atoms[1].y, 1);
    drawBond(ctx, atoms[1].x, atoms[1].y, atoms[2].x, atoms[2].y, 2);
    drawBond(ctx, atoms[1].x, atoms[1].y, atoms[3].x, atoms[3].y, 1);

    atoms.forEach(atom => drawAtom(ctx, atom.x, atom.y, atom.element));

    // Hydrogens
    drawAtom(ctx, centerX - 20, centerY - 20, 'H');
    drawAtom(ctx, centerX - 20, centerY + 20, 'H');
    drawAtom(ctx, centerX - 40, centerY, 'H');
    drawAtom(ctx, centerX + 10, centerY - 40, 'H');

    drawBond(ctx, centerX - 20, centerY, centerX - 20, centerY - 20, 1);
    drawBond(ctx, centerX - 20, centerY, centerX - 20, centerY + 20, 1);
    drawBond(ctx, centerX - 20, centerY, centerX - 40, centerY, 1);
    drawBond(ctx, centerX + 10, centerY - 25, centerX + 10, centerY - 40, 1);
  };

  const drawCaffeine = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    // Simplified caffeine structure - purine ring system
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(centerX - 40, centerY - 30, 80, 60);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(centerX - 40, centerY - 30, 80, 60);
    
    ctx.fillStyle = '#1f2937';
    ctx.font = '12px Arial';
    ctx.fillText('Caffeine Structure', centerX, centerY);
    ctx.font = '10px Arial';
    ctx.fillText('(Complex purine system)', centerX, centerY + 15);
  };

  const drawWater = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    drawAtom(ctx, centerX, centerY, 'O');
    drawAtom(ctx, centerX - 15, centerY + 20, 'H');
    drawAtom(ctx, centerX + 15, centerY + 20, 'H');
    
    drawBond(ctx, centerX, centerY, centerX - 15, centerY + 20, 1);
    drawBond(ctx, centerX, centerY, centerX + 15, centerY + 20, 1);
  };

  const drawMethane = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    drawAtom(ctx, centerX, centerY, 'C');
    drawAtom(ctx, centerX - 20, centerY, 'H');
    drawAtom(ctx, centerX + 20, centerY, 'H');
    drawAtom(ctx, centerX, centerY - 20, 'H');
    drawAtom(ctx, centerX, centerY + 20, 'H');
    
    drawBond(ctx, centerX, centerY, centerX - 20, centerY, 1);
    drawBond(ctx, centerX, centerY, centerX + 20, centerY, 1);
    drawBond(ctx, centerX, centerY, centerX, centerY - 20, 1);
    drawBond(ctx, centerX, centerY, centerX, centerY + 20, 1);
  };

  const drawGlucose = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    // Simplified glucose ring
    ctx.fillStyle = '#f0fdf4';
    ctx.fillRect(centerX - 35, centerY - 25, 70, 50);
    ctx.strokeStyle = '#bbf7d0';
    ctx.strokeRect(centerX - 35, centerY - 25, 70, 50);
    
    ctx.fillStyle = '#1f2937';
    ctx.font = '12px Arial';
    ctx.fillText('Glucose Ring', centerX, centerY - 5);
    ctx.font = '10px Arial';
    ctx.fillText('(C6H12O6)', centerX, centerY + 10);
  };

  const drawGenericMolecule = (ctx: CanvasRenderingContext2D, smiles: string, centerX: number, centerY: number) => {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(centerX - 40, centerY - 25, 80, 50);
    ctx.strokeStyle = '#cbd5e1';
    ctx.strokeRect(centerX - 40, centerY - 25, 80, 50);
    
    ctx.fillStyle = '#1f2937';
    ctx.font = '12px Arial';
    ctx.fillText('Molecular Structure', centerX, centerY - 8);
    ctx.font = '10px monospace';
    
    // Show SMILES for unknown structures
    const displaySmiles = smiles.length > 20 ? smiles.substring(0, 17) + '...' : smiles;
    ctx.fillText(displaySmiles, centerX, centerY + 8);
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-300 rounded-lg bg-white"
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90 rounded-lg">
          <span className="text-red-600 text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}