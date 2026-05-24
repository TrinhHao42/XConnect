"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
};

type InteractiveParticleFieldProps = {
  enabled?: boolean;
};

export default function InteractiveParticleField({ enabled = true }: InteractiveParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];

    const buildParticles = () => {
      const density = Math.max(18, Math.min(40, Math.floor((width * height) / 52000)));
      particles = Array.from({ length: density }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: 0.8 + Math.random() * 1.6,
        hue: Math.random() > 0.5 ? 185 : 280,
      }));
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      buildParticles();
    };

    const onMove = (event: PointerEvent) => {
      pointerRef.current.x = event.clientX;
      pointerRef.current.y = event.clientY;
      pointerRef.current.active = true;
    };

    const onLeave = () => {
      pointerRef.current.active = false;
    };

    const tick = () => {
      context.clearRect(0, 0, width, height);
      context.save();
      context.globalCompositeOperation = "lighter";

      const pointer = pointerRef.current;

      for (const particle of particles) {
        if (pointer.active) {
          const dx = pointer.x - particle.x;
          const dy = pointer.y - particle.y;
          const distance = Math.max(Math.hypot(dx, dy), 0.001);
          if (distance < 180) {
            const force = (1 - distance / 180) * 0.02;
            particle.vx -= (dx / distance) * force;
            particle.vy -= (dy / distance) * force;
          }
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.985;
        particle.vy *= 0.985;

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;
      }

      for (let i = 0; i < particles.length; i += 1) {
        const current = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const next = particles[j];
          const dx = next.x - current.x;
          const dy = next.y - current.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 96) {
            const alpha = 1 - distance / 96;
            const gradient = context.createLinearGradient(current.x, current.y, next.x, next.y);
            gradient.addColorStop(0, `rgba(0, 240, 255, ${alpha * 0.55})`);
            gradient.addColorStop(0.5, `rgba(122, 0, 255, ${alpha * 0.25})`);
            gradient.addColorStop(1, `rgba(255, 0, 200, ${alpha * 0.45})`);
            context.strokeStyle = gradient;
            context.lineWidth = alpha * 1.2;
            context.beginPath();
            context.moveTo(current.x, current.y);
            context.lineTo(next.x, next.y);
            context.stroke();
          }
        }

        const glow = context.createRadialGradient(current.x, current.y, 0, current.x, current.y, current.radius * 10);
        glow.addColorStop(0, `hsla(${current.hue}, 100%, 70%, 0.85)`);
        glow.addColorStop(0.55, `hsla(${current.hue}, 100%, 60%, 0.16)`);
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(current.x, current.y, current.radius * 5, 0, Math.PI * 2);
        context.fill();
      }

      context.restore();
      frame = window.requestAnimationFrame(tick);
    };

    resize();
    frame = window.requestAnimationFrame(tick);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  if (!enabled) return null;

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-55 mix-blend-screen" aria-hidden="true" />;
}
