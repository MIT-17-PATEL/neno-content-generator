"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Sparkles, Zap, EyeOff, Eye, RefreshCw, Trophy, Activity } from "lucide-react";

interface NodeItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  pulsePhase: number;
}

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  opacity: number;
  vy: number;
}

interface PulseEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

export function AISignalGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Animation refs to avoid React state overhead on 60fps frame loop
  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nodesRef = useRef<NodeItem[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const pulsesRef = useRef<PulseEffect[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const coreRotationRef = useRef(0);
  const corePulseRef = useRef(0);
  const dimensionsRef = useRef<{ width: number; height: number }>({ width: 720, height: 300 });

  // Initialize interactive nodes
  const initNodes = useCallback((width: number, height: number) => {
    const validWidth = Math.max(300, width || 720);
    const validHeight = Math.max(220, height || 300);
    const isMobile = validWidth < 520;
    const nodeCount = isMobile ? 9 : 14;
    const colors = ["#f97316", "#fb923c", "#fdba74", "#38bdf8", "#818cf8", "#34d399"];

    const nodes: NodeItem[] = [];
    const centerX = validWidth / 2;
    const centerY = validHeight / 2;

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2 + Math.random() * 0.4;
      const distance = 55 + Math.random() * (Math.min(validWidth, validHeight) / 2.3 - 60);

      nodes.push({
        id: i,
        x: Math.max(20, Math.min(validWidth - 20, centerX + Math.cos(angle) * distance)),
        y: Math.max(20, Math.min(validHeight - 20, centerY + Math.sin(angle) * distance)),
        vx: (Math.random() - 0.5) * 0.75,
        vy: (Math.random() - 0.5) * 0.75,
        radius: isMobile ? 7 : 6,
        color: colors[i % colors.length],
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    nodesRef.current = nodes;
  }, []);

  // Handle click / tap on nodes
  const handleInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    const nodes = nodesRef.current;
    let hitIndex = -1;

    // Generous touch hit box for effortless clicking
    const hitPadding = 22;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const dist = Math.hypot(clickX - node.x, clickY - node.y);
      if (dist <= node.radius + hitPadding) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex !== -1) {
      const target = nodes[hitIndex];

      // Update score and combo
      const currentCombo = comboRef.current;
      const pointsEarned = 10 * currentCombo;
      const newScore = scoreRef.current + pointsEarned;
      const nextCombo = Math.min(10, currentCombo + 1);

      scoreRef.current = newScore;
      comboRef.current = nextCombo;
      setScore(newScore);
      setCombo(nextCombo);
      setHighScore((prev) => Math.max(prev, newScore));

      // Reset combo decay (3 seconds)
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        comboRef.current = 1;
        setCombo(1);
      }, 3000);

      // Add shockwave pulse
      pulsesRef.current.push({
        x: target.x,
        y: target.y,
        radius: target.radius,
        maxRadius: 42,
        opacity: 0.95,
        color: target.color,
      });

      // Add floating score badge
      floatingTextsRef.current.push({
        id: Date.now() + Math.random(),
        x: target.x,
        y: target.y - 12,
        text: currentCombo > 1 ? `+${pointsEarned} ×${currentCombo}` : `+${pointsEarned}`,
        opacity: 1,
        vy: -0.9,
      });

      // Respawn target node
      const { width, height } = dimensionsRef.current;
      const angle = Math.random() * Math.PI * 2;
      const distance = 55 + Math.random() * (Math.min(width, height) / 2.3 - 60);
      const centerX = width / 2;
      const centerY = height / 2;

      target.x = Math.max(20, Math.min(width - 20, centerX + Math.cos(angle) * distance));
      target.y = Math.max(20, Math.min(height - 20, centerY + Math.sin(angle) * distance));
      target.vx = (Math.random() - 0.5) * 0.85;
      target.vy = (Math.random() - 0.5) * 0.85;
    }
  };

  // Setup Canvas & Animation Loop
  useEffect(() => {
    if (isCollapsed) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updateCanvasSize = () => {
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const width = Math.max(300, rect.width || 720);
      const height = 300;

      dimensionsRef.current = { width, height };

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (nodesRef.current.length === 0) {
        initNodes(width, height);
      }
    };

    updateCanvasSize();

    // Use ResizeObserver for precise container measurements
    const observer = new ResizeObserver(() => {
      updateCanvasSize();
    });
    observer.observe(container);

    // Render loop
    const render = () => {
      if (!isRunning || !canvas || !container) return;

      const { width, height } = dimensionsRef.current;
      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Clear background & draw radial cyberpunk dark canvas
      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        15,
        centerX,
        centerY,
        Math.max(width, height) / 1.4
      );
      bgGradient.addColorStop(0, "#0e1526");
      bgGradient.addColorStop(0.5, "#080c16");
      bgGradient.addColorStop(1, "#04060c");

      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // 2. Subtle Matrix Dot Grid
      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      const dotSpacing = 30;
      for (let gx = dotSpacing / 2; gx < width; gx += dotSpacing) {
        for (let gy = dotSpacing / 2; gy < height; gy += dotSpacing) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Central AI Core
      if (!prefersReducedMotion) {
        coreRotationRef.current += 0.012;
        corePulseRef.current += 0.04;
      }
      const corePulse = Math.sin(corePulseRef.current) * 2.5;

      // Outer Dashed Orbit Ring
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(coreRotationRef.current);
      ctx.strokeStyle = "rgba(249, 115, 22, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 34 + corePulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Outer Core Glow
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 30);
      coreGlow.addColorStop(0, "rgba(249, 115, 22, 0.9)");
      coreGlow.addColorStop(0.5, "rgba(234, 88, 12, 0.35)");
      coreGlow.addColorStop(1, "rgba(234, 88, 12, 0)");

      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.fill();

      // Core Center Disc
      ctx.fillStyle = "#ea580c";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 13, 0, Math.PI * 2);
      ctx.fill();

      // Center Core "AI" Typography
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("AI", centerX, centerY);

      // 4. Update and Connect Nodes
      const nodes = nodesRef.current;
      const maxConnDist = 95;
      const coreConnDist = 135;

      // Connection lines to Core
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const distToCore = Math.hypot(a.x - centerX, a.y - centerY);
        if (distToCore < coreConnDist) {
          const alpha = (1 - distToCore / coreConnDist) * 0.28;
          ctx.strokeStyle = `rgba(249, 115, 22, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(centerX, centerY);
          ctx.stroke();
        }

        // Connection lines between nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < maxConnDist) {
            const alpha = (1 - dist / maxConnDist) * 0.28;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw and Move Nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (!prefersReducedMotion) {
          node.x += node.vx;
          node.y += node.vy;
          node.pulsePhase += 0.045;

          const pad = node.radius + 6;
          if (node.x < pad) {
            node.x = pad;
            node.vx *= -1;
          } else if (node.x > width - pad) {
            node.x = width - pad;
            node.vx *= -1;
          }
          if (node.y < pad) {
            node.y = pad;
            node.vy *= -1;
          } else if (node.y > height - pad) {
            node.y = height - pad;
            node.vy *= -1;
          }
        }

        // Node Glow Aura
        const nodePulse = Math.sin(node.pulsePhase) * 1.5;
        const aura = ctx.createRadialGradient(
          node.x,
          node.y,
          node.radius * 0.4,
          node.x,
          node.y,
          node.radius + 7 + nodePulse
        );
        aura.addColorStop(0, node.color);
        aura.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 7 + nodePulse, 0, Math.PI * 2);
        ctx.fill();

        // Node Solid Disc
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner Bright Core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1.5, node.radius * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Draw Expanding Shockwaves
      const activePulses = [];
      for (let i = 0; i < pulsesRef.current.length; i++) {
        const p = pulsesRef.current[i];
        p.radius += 2.2;
        p.opacity -= 0.04;

        if (p.opacity > 0 && p.radius < p.maxRadius) {
          ctx.strokeStyle = `rgba(249, 115, 22, ${p.opacity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.stroke();
          activePulses.push(p);
        }
      }
      pulsesRef.current = activePulses;

      // 6. Draw Floating Score Text
      const activeTexts = [];
      for (let i = 0; i < floatingTextsRef.current.length; i++) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy;
        ft.opacity -= 0.022;

        if (ft.opacity > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${ft.opacity})`;
          ctx.font = "bold 11px ui-sans-serif, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(ft.text, ft.x, ft.y);
          activeTexts.push(ft);
        }
      }
      floatingTextsRef.current = activeTexts;

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      observer.disconnect();
    };
  }, [initNodes, isCollapsed]);

  return (
    <div className="w-full space-y-3">
      {/* Mini-Game Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-orange-100 text-orange-600">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 tracking-wide">
                AI Signal
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Network Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Keep the signal alive while your content is being prepared
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[11px] text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-md transition-colors"
        >
          {isCollapsed ? (
            <>
              <Eye className="h-3.5 w-3.5 text-slate-500" />
              <span>Show Activity</span>
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5 text-slate-500" />
              <span>Hide Activity</span>
            </>
          )}
        </button>
      </div>

      {/* Interactive Canvas View */}
      {!isCollapsed && (
        <div
          ref={containerRef}
          className="relative w-full rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-[#04060c] select-none touch-none"
          style={{ height: "300px" }}
        >
          <canvas
            ref={canvasRef}
            onClick={(e) => handleInteraction(e.clientX, e.clientY)}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                const t = e.touches[0];
                handleInteraction(t.clientX, t.clientY);
              }
            }}
            className="w-full h-full block cursor-crosshair"
          />

          {/* Top Score HUD */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2.5">
              <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 shadow-md flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  SCORE
                </span>
                <span className="text-sm font-black font-mono text-white">
                  {score}
                </span>
              </div>

              {combo > 1 && (
                <div className="bg-orange-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-orange-500/60 shadow-md flex items-center gap-1.5 animate-in zoom-in-90 duration-150">
                  <Sparkles className="h-3 w-3 text-orange-400" />
                  <span className="text-xs font-black font-mono text-orange-400">
                    COMBO ×{combo}
                  </span>
                </div>
              )}
            </div>

            <div className="text-[10px] font-medium text-slate-400 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800 hidden sm:flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-orange-400 animate-pulse" />
              <span>Tap glowing nodes</span>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none text-[10px] text-slate-500 font-mono">
            <span>SIGNAL FREQUENCY: 2.4 GHz</span>
            {highScore > 0 && <span className="text-slate-400 font-bold">BEST: {highScore}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const CONTENT_TIPS = [
  "Tip: Use specific technical topics and sub-domains to generate more focused, benchmark-rich articles.",
  "Tip: Generated articles can be reviewed, edited, and published directly from the Content Library.",
  "Tip: AI Featured Hero Images are automatically generated in high-resolution 16:9 editorial format.",
  "Tip: You can customize your brand voice, prohibited terms, and target audience persona in Settings.",
  "Tip: Publishing an article immediately synchronizes with the public website and purges ISR cache tags.",
  "Tip: Batch mode allows you to orchestrate up to 10 articles in a single background execution run.",
];

export function ContentStudioTip() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % CONTENT_TIPS.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full p-3.5 rounded-lg bg-orange-50/80 border border-orange-200/80 flex items-start gap-3 shadow-sm">
      <div className="p-1.5 rounded-md bg-orange-100 text-orange-600 shrink-0 mt-0.5">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="space-y-0.5">
        <span className="text-[11px] font-bold text-orange-950 uppercase tracking-wide">
          Content Studio Tip
        </span>
        <p className="text-xs text-orange-900/90 leading-relaxed transition-all duration-300">
          {CONTENT_TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
}
