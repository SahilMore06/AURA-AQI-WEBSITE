import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useTransform, motion, MotionValue } from 'motion/react';

export function ScrollGlobe({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeScale = useTransform(scrollYProgress, [0, 0.9], [1, 4]);
  const globeOpacity = useTransform(scrollYProgress, [0.85, 1.0], [1, 0]);
  const globeBlur = useTransform(scrollYProgress, [0.85, 1.0], [0, 20]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);

    const projection = d3.geoOrthographic()
      .scale(Math.min(width, height) / 2.5)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath(projection, context);

    let rotation = 0;
    let animationFrameId: number;

    // Generate some random "cities" for the dotted effect
    const cities = Array.from({ length: 300 }, () => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [Math.random() * 360 - 180, Math.random() * 180 - 90]
      }
    }));

    const render = () => {
      context.clearRect(0, 0, width, height);

      const graticule = d3.geoGraticule10();

      projection.rotate([rotation, -15]);
      
      const currentScale = globeScale.get();
      projection.scale((Math.min(width, height) / 2.5) * currentScale);

      // Draw Sphere (Ocean)
      context.beginPath();
      path({ type: 'Sphere' } as any);
      context.fillStyle = 'rgba(7, 13, 26, 1)';
      context.fill();
      
      // Draw Graticule (Wireframe)
      context.beginPath();
      path(graticule as any);
      context.lineWidth = 0.5;
      context.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      context.stroke();

      // Draw "Cities" (Dots)
      context.beginPath();
      cities.forEach((city: any) => {
        path(city);
      });
      context.fillStyle = 'rgba(0, 212, 170, 0.8)'; // Accent color
      context.fill();

      // Draw Sphere Outline
      context.beginPath();
      path({ type: 'Sphere' } as any);
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      context.stroke();

      rotation += 0.15;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.scale(dpr, dpr);
      projection.translate([width / 2, height / 2]);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [globeScale]);

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{
        opacity: globeOpacity,
        filter: useTransform(globeBlur, (v) => `blur(${v}px)`),
      }}
    />
  );
}
