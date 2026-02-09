import React, { useRef, useEffect, useState } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
  color: string;
}

interface Props {
  points: Point3D[];
  range: number;
  title: string;
}

const ThreeDScatter: React.FC<Props> = ({ points, range, title }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: -0.5, y: 0.5 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Draw function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const cx = width / 2;
    const cy = height / 2;

    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Projection settings
    const scale = Math.min(width, height) / (range * 4); // Zoom
    
    const project = (x: number, y: number, z: number) => {
        // Rotate Y (horizontal mouse)
        const x1 = x * Math.cos(rotation.y) - z * Math.sin(rotation.y);
        const z1 = x * Math.sin(rotation.y) + z * Math.cos(rotation.y);
        
        // Rotate X (vertical mouse)
        const y2 = y * Math.cos(rotation.x) - z1 * Math.sin(rotation.x);
        const z2 = y * Math.sin(rotation.x) + z1 * Math.cos(rotation.x);
        
        // 2D Projection (Perspective-ish)
        // Simple isometric-like for stability:
        // return { x: cx + x1 * scale, y: cy - y2 * scale, z: z2 };
        
        // Let's do weak perspective
        const f = 500;
        const dist = f / (f - z2 * scale); // z2 is small range, scale makes it screen pixels
        // Wait, z2 is in data units approx [-range, range].
        // Let's stick to simple orthographic for clarity of axes, 
        // or simple projection.
        
        return {
            x: cx + x1 * scale,
            y: cy + y2 * scale, // y is gene 1. In standard 3D, Z is up. 
                               // But here Z is fitness (up/down).
                               // Usually we plot X, Y on ground, Z vertical.
            z: z2
        };
    };

    // We want X, Y on the "floor", Z is height.
    // My project function above assumes Y is vertical screen axis.
    // So mapping: 
    // Data X -> World X
    // Data Y -> World Z (depth)
    // Data Z (Fitness) -> World Y (Height) - inverted because screen Y is down.
    
    // Revised Projection wrapper
    const transform = (dx: number, dy: number, dz: number) => {
        // dx, dy are genes. dz is fitness (0 to large positive).
        // Center the data
        // X ranges [-range, range]
        // Y ranges [-range, range]
        // Z ranges [0, range^2*2] -> [0, 50]. 
        // We want to center Z visually around maybe 10? Or just 0.
        // Let's shift Z down so 0 is at the bottom of the bounding box?
        // Actually, let's keep Z=0 as the target.
        
        // World coordinates:
        const wx = dx;
        const wz = dy; 
        const wy = -dz * 0.2; // Scale Z down a bit and flip so +Fitness is UP (negative screen Y)
        
        return project(wx, wy, wz);
    };

    // 1. Draw Axis / Grid (The Bowl)
    ctx.strokeStyle = '#334155'; // Slate-700
    ctx.lineWidth = 1;
    
    // Draw wireframe grid for the sphere function z = x^2 + y^2
    // We'll draw concentric circles and radial lines? Or a grid?
    // Grid is better.
    const steps = 10;
    const stepSize = (range * 2) / steps;

    ctx.beginPath();
    for (let x = -range; x <= range; x += stepSize) {
        for (let y = -range; y <= range; y += stepSize/5) { // Fine steps for smooth curve
            const z = x*x + y*y;
            const p = transform(x, y, z);
            if (y === -range) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
    }
    for (let y = -range; y <= range; y += stepSize) {
        for (let x = -range; x <= range; x += stepSize/5) {
             const z = x*x + y*y;
             const p = transform(x, y, z);
             if (x === -range) ctx.moveTo(p.x, p.y);
             else ctx.lineTo(p.x, p.y);
        }
    }
    ctx.stroke();

    // 2. Draw Points
    points.forEach(pt => {
        const p = transform(pt.x, pt.y, pt.z);
        
        // Draw point
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        // Size depends on depth (z) slightly for 3D effect
        const radius = Math.max(2, 4 + p.z * 0.05); 
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Optional: Drop line to surface (shadow) or to zero plane?
        // Let's just draw the point.
    });

    // 3. Draw Target (0,0,0)
    const center = transform(0, 0, 0);
    ctx.fillStyle = '#10b981'; // Emerald
    ctx.beginPath();
    ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [points, range, rotation]);

  // Mouse Interactivity
  const handleMouseDown = (e: React.MouseEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      
      setRotation(prev => ({
          x: prev.x + dy * 0.01,
          y: prev.y + dx * 0.01
      }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
      isDragging.current = false;
  };

  return (
    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 h-full flex flex-col">
      <h3 className="text-xs uppercase text-slate-400 mb-2 select-none">{title}</h3>
      <div className="flex-1 min-h-0 relative cursor-move"
           onMouseDown={handleMouseDown}
           onMouseMove={handleMouseMove}
           onMouseUp={handleMouseUp}
           onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 pointer-events-none">
            Drag to Rotate
        </div>
      </div>
    </div>
  );
};

export default ThreeDScatter;
