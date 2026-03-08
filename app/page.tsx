"use client";

import { useEffect, useRef, useCallback, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  side: "left" | "right";
  radius: number;
  role: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 40;
const LINK_DISTANCE = 130;
const SPEED = 1.2;
const RADIUS = 11;
const CYAN = "#00F0FF";
const MAGENTA = "#FF90E8";
const AVATAR_SIZE = 22;
const HOVER_HIT_RADIUS = 22;
const PARALLAX_FACTOR = 0.05; // lerp speed — low = buttery smooth
const PARALLAX_CANVAS_PX = 8; // max canvas offset in px
const PARALLAX_TITLE_PX = 6; // max title offset in px
const PARALLAX_GRID_PX = 4; // max grid offset in px

const TECH_ROLES = [
  "FRONTEND",
  "BACKEND",
  "DEVOPS",
  "AI_RESEARCHER",
  "SYS_ADMIN",
  "DATA_ENG",
  "FULL_STACK",
  "SEC_OPS",
  "ML_OPS",
  "UI_UX",
];

// ── Cute Pixel-Art SVG Avatars ─────────────────────────────────────────────
const MALE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <rect x="3" y="10" width="10" height="6" fill="#3B82F6"/>
  <rect x="5" y="10" width="6" height="2" fill="#2563EB"/>
  <rect x="6" y="8" width="4" height="2" fill="#FBBF24"/>
  <rect x="4" y="3" width="8" height="7" fill="#FBBF24"/>
  <rect x="4" y="2" width="2" height="2" fill="#1F2937"/>
  <rect x="6" y="1" width="2" height="3" fill="#1F2937"/>
  <rect x="8" y="2" width="2" height="2" fill="#1F2937"/>
  <rect x="10" y="1" width="2" height="3" fill="#1F2937"/>
  <rect x="4" y="6" width="3" height="2" fill="#1F2937"/>
  <rect x="9" y="6" width="3" height="2" fill="#1F2937"/>
  <rect x="7" y="7" width="2" height="1" fill="#1F2937"/>
  <rect x="5" y="6" width="1" height="1" fill="#60A5FA"/>
  <rect x="10" y="6" width="1" height="1" fill="#60A5FA"/>
  <rect x="6" y="9" width="4" height="1" fill="#92400E"/>
  <rect x="6" y="12" width="4" height="2" fill="#2563EB"/>
</svg>`;

const FEMALE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
  <rect x="3" y="10" width="10" height="6" fill="#EC4899"/>
  <rect x="5" y="10" width="6" height="2" fill="#DB2777"/>
  <rect x="6" y="8" width="4" height="2" fill="#FBBF24"/>
  <rect x="4" y="3" width="8" height="7" fill="#FBBF24"/>
  <rect x="3" y="2" width="10" height="3" fill="#7C3AED"/>
  <rect x="3" y="5" width="2" height="5" fill="#7C3AED"/>
  <rect x="11" y="5" width="2" height="5" fill="#7C3AED"/>
  <rect x="4" y="6" width="3" height="2" fill="#1F2937"/>
  <rect x="9" y="6" width="3" height="2" fill="#1F2937"/>
  <rect x="7" y="7" width="2" height="1" fill="#1F2937"/>
  <rect x="5" y="6" width="1" height="1" fill="#F472B6"/>
  <rect x="10" y="6" width="1" height="1" fill="#F472B6"/>
  <rect x="6" y="9" width="4" height="1" fill="#92400E"/>
  <rect x="6" y="12" width="4" height="2" fill="#DB2777"/>
</svg>`;

function svgToDataUrl(svgStr: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
}

function makeParticle(side: "left" | "right", w: number, h: number): Particle {
  const half = w / 2;
  const angle = Math.random() * Math.PI * 2;
  return {
    x: side === "left"
      ? Math.random() * (half - 30) + 15
      : Math.random() * (half - 30) + half + 15,
    y: Math.random() * (h - 30) + 15,
    vx: Math.cos(angle) * SPEED * (0.5 + Math.random()),
    vy: Math.sin(angle) * SPEED * (0.5 + Math.random()),
    color: side === "left" ? CYAN : MAGENTA,
    side,
    radius: RADIUS,
    role: TECH_ROLES[Math.floor(Math.random() * TECH_ROLES.length)],
  };
}

// ── Rounded-rect helper (for tooltip background) ──────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [showMeaning, setShowMeaning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const wallActiveRef = useRef(true);
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const maleImgRef = useRef<HTMLImageElement | null>(null);
  const femaleImgRef = useRef<HTMLImageElement | null>(null);
  const imagesReadyRef = useRef(false);

  // ── Feature 1: Hover tooltip refs ──
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredIndexRef = useRef<number>(-1);
  const tooltipOpacityRef = useRef(0);

  // ── Feature 2: Parallax refs ──
  const rawMouseRef = useRef<{ nx: number; ny: number }>({ nx: 0, ny: 0 });
  const smoothParallaxRef = useRef<{ nx: number; ny: number }>({ nx: 0, ny: 0 });
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  // ── Feature 3: Easter egg CLI state ──
  const [cmdVisible, setCmdVisible] = useState(false);
  const [cmdText, setCmdText] = useState("");
  const [glitchActive, setGlitchActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cmdInputRef = useRef<HTMLInputElement>(null);

  // ── Dynamic Metrics state ──
  const [liveConnections, setLiveConnections] = useState(0);
  const [liveSynergy, setLiveSynergy] = useState(0);
  const [liveStatus, setLiveStatus] = useState("AWAITING_CATALYST");
  const [crossLinks, setCrossLinks] = useState(0);
  const wallBrokenRef = useRef(false);

  // ── Audio refs ──
  const audioCtxRef = useRef<AudioContext | null>(null);
  const droneNodeRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const audioStartedRef = useRef(false);

  // ── Boot Intro state ──
  const [introDone, setIntroDone] = useState(false);
  const [introLines, setIntroLines] = useState<string[]>([]);
  const [introFading, setIntroFading] = useState(false);

  const BOOT_LINES = [
    "> INITIALIZING OIKYA_PROTOCOL v2.26...",
    "> LOADING 40 ENTITIES...",
    "> BARRIER: ██████████ ACTIVE",
    "> GENDER_DIVIDE_SIMULATION: READY",
    "> AWAITING HUMAN CATALYST...",
  ];

  // Load avatar images
  useEffect(() => {
    const mImg = new Image();
    const fImg = new Image();
    mImg.src = svgToDataUrl(MALE_SVG);
    fImg.src = svgToDataUrl(FEMALE_SVG);
    let loaded = 0;
    const onLoad = () => { loaded++; if (loaded === 2) imagesReadyRef.current = true; };
    mImg.onload = onLoad;
    fImg.onload = onLoad;
    maleImgRef.current = mImg;
    femaleImgRef.current = fImg;
  }, []);

  const initParticles = useCallback((w: number, h: number) => {
    const p: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT / 2; i++) p.push(makeParticle("left", w, h));
    for (let i = 0; i < PARTICLE_COUNT / 2; i++) p.push(makeParticle("right", w, h));
    return p;
  }, []);

  // ── Boot Intro typed sequence ──
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setIntroLines((prev) => [...prev, BOOT_LINES[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIntroFading(true), 600);
        setTimeout(() => setIntroDone(true), 1400);
      }
    }, 420);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Audio helpers ──
  const initAudio = useCallback(() => {
    if (audioStartedRef.current) return;
    audioStartedRef.current = true;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    // Ambient drone — two detuned oscillators
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.03;
    droneGain.connect(ctx.destination);
    droneGainRef.current = droneGain;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 55;
    osc1.connect(droneGain);
    osc1.start();

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 55.4; // slight detune for movement
    osc2.connect(droneGain);
    osc2.start();
    droneNodeRef.current = osc1;
  }, []);

  const playShatter = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    // White noise burst + filter sweep for "glass shatter"
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }, []);

  const playPing = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 800 + Math.random() * 600;
    const gain = ctx.createGain();
    gain.gain.value = 0.02;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }, []);

  const triggerBarrierBreak = useCallback(() => {
    if (!wallBrokenRef.current) {
      wallBrokenRef.current = true;
      setLiveStatus("UNIFIED");
      initAudio();
      setTimeout(() => playShatter(), 50);
    }
  }, [initAudio, playShatter]);

  // ── Feature 3: Easter egg keyboard listener ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if meaning popup is open, intro playing, or if focused on an input
      if (showMeaning || !introDone) return;

      // If cmd is visible and focused, let the input handle it
      if (cmdVisible && cmdInputRef.current === document.activeElement) return;

      // Show CLI on printable key press
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!cmdVisible) {
          setCmdVisible(true);
          setCmdText(e.key.toUpperCase());
          // Wait a tick for the input to render, then focus it
          setTimeout(() => cmdInputRef.current?.focus(), 0);
        }
        e.preventDefault();
      }

      if (e.key === "Escape") {
        setCmdVisible(false);
        setCmdText("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cmdVisible, showMeaning]);

  const handleCmdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (cmdText.trim() === "EXECUTE OIKYA") {
        // Trigger barrier break
        wallActiveRef.current = false;
        triggerBarrierBreak();
        // Trigger glitch shake
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 500);
      }
      setCmdVisible(false);
      setCmdText("");
    } else if (e.key === "Escape") {
      setCmdVisible(false);
      setCmdText("");
    }
  };

  // ── Main canvas animation ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = initParticles(canvas.width, canvas.height);
      wallActiveRef.current = true;
    };
    resize();
    window.addEventListener("resize", resize);

    // Drag listeners (existing)
    const onDown = () => { isDraggingRef.current = true; };
    const onMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        wallActiveRef.current = false;
        triggerBarrierBreak();
      }
      // Feature 1: track mouse for hover detection
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      // Feature 2: track normalized mouse for parallax
      const nx = (e.clientX / window.innerWidth) * 2 - 1;  // -1..1
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      rawMouseRef.current = { nx, ny };
    };
    const onUp = () => { isDraggingRef.current = false; };
    const onLeave = () => {
      mouseRef.current = null;
    };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("touchstart", onDown);
    canvas.addEventListener("touchmove", (e) => {
      if (isDraggingRef.current) wallActiveRef.current = false;
    });
    canvas.addEventListener("touchend", onUp);

    // Global mousemove for parallax (when mouse is not over canvas)
    const onGlobalMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      rawMouseRef.current = { nx, ny };
    };
    window.addEventListener("mousemove", onGlobalMove);

    let frameCount = 0;

    const animate = () => {
      const w = canvas.width;
      const h = canvas.height;
      const center = w / 2;
      const wallActive = wallActiveRef.current;
      const particles = particlesRef.current;

      // ── Feature 2: Smooth parallax interpolation ──
      const sp = smoothParallaxRef.current;
      const rp = rawMouseRef.current;
      sp.nx += (rp.nx - sp.nx) * PARALLAX_FACTOR;
      sp.ny += (rp.ny - sp.ny) * PARALLAX_FACTOR;
      const pxOffset = sp.nx * PARALLAX_CANVAS_PX;
      const pyOffset = sp.ny * PARALLAX_CANVAS_PX;

      // Update React state for title & grid parallax (throttled to every 2 frames)
      frameCount++;
      if (frameCount % 2 === 0) {
        setParallaxOffset({ x: sp.nx, y: sp.ny });
      }

      ctx.clearRect(0, 0, w, h);

      // ── Feature 1: Hover detection ──
      let newHoveredIndex = -1;
      const mouse = mouseRef.current;
      if (mouse) {
        // Adjust mouse position for parallax offset
        const mx = mouse.x - pxOffset;
        const my = mouse.y - pyOffset;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const dx = p.x - mx;
          const dy = p.y - my;
          if (Math.sqrt(dx * dx + dy * dy) < HOVER_HIT_RADIUS) {
            newHoveredIndex = i;
            break;
          }
        }
      }

      // Handle hover state transitions
      if (newHoveredIndex !== hoveredIndexRef.current) {
        tooltipOpacityRef.current = 0;
        hoveredIndexRef.current = newHoveredIndex;
      }
      if (newHoveredIndex >= 0) {
        tooltipOpacityRef.current = Math.min(1, tooltipOpacityRef.current + 0.12);
      }

      // ── Update particle positions (freeze hovered one) ──
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (i === hoveredIndexRef.current) continue; // Freeze hovered particle

        p.x += p.vx; p.y += p.vy;
        if (p.x < p.radius) { p.x = p.radius; p.vx = Math.abs(p.vx); }
        if (p.x > w - p.radius) { p.x = w - p.radius; p.vx = -Math.abs(p.vx); }
        if (p.y < p.radius) { p.y = p.radius; p.vy = Math.abs(p.vy); }
        if (p.y > h - p.radius) { p.y = h - p.radius; p.vy = -Math.abs(p.vy); }
        if (wallActive) {
          if (p.side === "left" && p.x >= center - p.radius) { p.x = center - p.radius; p.vx = -Math.abs(p.vx); }
          if (p.side === "right" && p.x <= center + p.radius) { p.x = center + p.radius; p.vx = Math.abs(p.vx); }
        }
      }

      // ── Draw with parallax offset ──
      ctx.save();
      ctx.translate(pxOffset, pyOffset);

      // Draw links
      if (!wallActive) {
        let currentConns = 0;
        let currentCross = 0;

        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i], b = particles[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= LINK_DISTANCE) continue;

            currentConns++;
            if (a.side !== b.side) currentCross++;

            const alpha = (1 - dist / LINK_DISTANCE) * 0.6;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            if (a.side !== b.side) {
              const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
              grad.addColorStop(0, `rgba(0, 240, 255, ${alpha})`);
              grad.addColorStop(0.5, `rgba(178, 141, 255, ${alpha})`);
              grad.addColorStop(1, `rgba(255, 144, 232, ${alpha})`);
              ctx.strokeStyle = grad;
              ctx.shadowColor = "rgba(178,141,255,0.7)";
              ctx.shadowBlur = 12;
            } else {
              const base = a.side === "left" ? "0,240,255" : "255,144,232";
              ctx.strokeStyle = `rgba(${base}, ${alpha})`;
              ctx.shadowColor = a.color;
              ctx.shadowBlur = 8;
            }
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          }
        }

        // Update state periodically and trigger pings
        if (frameCount % 8 === 0) {
          setLiveConnections(currentConns);
          setLiveSynergy(Math.min(100, Math.floor((currentConns / 140) * 100)));

          setCrossLinks(prev => {
            if (currentCross > prev && Math.random() > 0.4) playPing();
            return currentCross;
          });
        }
      }

      // Draw wall
      if (wallActive) {
        const grad = ctx.createLinearGradient(center, 0, center, h);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.2, "rgba(255,255,255,0.05)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.1)");
        grad.addColorStop(0.8, "rgba(255,255,255,0.05)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.save();
        ctx.fillStyle = grad;
        ctx.shadowColor = "rgba(255,255,255,0.3)";
        ctx.shadowBlur = 12;
        ctx.fillRect(center - 1, 0, 2, h);
        ctx.restore();
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const half = AVATAR_SIZE / 2;
        const isHovered = i === hoveredIndexRef.current;

        ctx.save();

        // Enhanced glow ring for hovered particle
        if (isHovered) {
          const glowRadius = AVATAR_SIZE * 1.1;
          const hoverGlow = ctx.createRadialGradient(p.x, p.y, AVATAR_SIZE * 0.4, p.x, p.y, glowRadius);
          const glowColor = p.side === "left" ? "0,240,255" : "255,144,232";
          hoverGlow.addColorStop(0, `rgba(${glowColor},0.35)`);
          hoverGlow.addColorStop(0.6, `rgba(${glowColor},0.15)`);
          hoverGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = hoverGlow;
          ctx.fill();

          // Pulsing ring
          ctx.beginPath();
          ctx.arc(p.x, p.y, AVATAR_SIZE * 0.85, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${glowColor}, ${0.4 + Math.sin(Date.now() * 0.006) * 0.2})`;
          ctx.lineWidth = 1.2;
          ctx.shadowColor = `rgba(${glowColor}, 0.8)`;
          ctx.shadowBlur = 10;
          ctx.stroke();
        }

        // Normal glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, AVATAR_SIZE * 0.7, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, AVATAR_SIZE * 0.7);
        glow.addColorStop(0, p.side === "left" ? "rgba(0,240,255,0.2)" : "rgba(255,144,232,0.2)");
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fill();

        if (imagesReadyRef.current) {
          const img = p.side === "left" ? maleImgRef.current : femaleImgRef.current;
          if (img) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, p.x - half, p.y - half, AVATAR_SIZE, AVATAR_SIZE);
          }
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 14;
          ctx.fill();
        }
        ctx.restore();
      }

      // ── Feature 1: Draw tooltip for hovered particle ──
      if (hoveredIndexRef.current >= 0 && tooltipOpacityRef.current > 0) {
        const hp = particles[hoveredIndexRef.current];
        const tooltipText = `[ROLE: ${hp.role}]`;
        const opacity = tooltipOpacityRef.current;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.font = "10px 'JetBrains Mono', monospace";

        const textMetrics = ctx.measureText(tooltipText);
        const textW = textMetrics.width;
        const padX = 10;
        const padY = 6;
        const tipW = textW + padX * 2;
        const tipH = 22;

        // Position tooltip: above-right of the avatar, but clamp to canvas bounds
        let tipX = hp.x + AVATAR_SIZE * 0.5 + 6;
        let tipY = hp.y - AVATAR_SIZE - 8;
        // Clamp right edge
        if (tipX + tipW > w - 10) tipX = hp.x - tipW - 6;
        // Clamp top
        if (tipY < 10) tipY = hp.y + AVATAR_SIZE + 8;

        // Draw pill background
        ctx.save();
        roundRect(ctx, tipX, tipY, tipW, tipH, 4);
        ctx.fillStyle = "rgba(10, 10, 18, 0.9)";
        ctx.fill();

        // Border
        const borderColor = hp.side === "left" ? "rgba(0,240,255,0.6)" : "rgba(255,144,232,0.6)";
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        // Draw text
        ctx.save();
        const textColor = hp.side === "left" ? "#00F0FF" : "#FF90E8";
        ctx.fillStyle = textColor;
        ctx.shadowColor = textColor;
        ctx.shadowBlur = 12;
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        ctx.textBaseline = "middle";
        ctx.fillText(tooltipText, tipX + padX, tipY + tipH / 2);
        ctx.restore();

        ctx.restore();
      }

      ctx.restore(); // end parallax translate

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onGlobalMove);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("touchstart", onDown);
      canvas.removeEventListener("touchend", onUp);
    };
  }, [initParticles]);

  // ── Derived parallax styles ──
  const gridBgStyle = {
    backgroundPosition: `${-parallaxOffset.x * PARALLAX_GRID_PX}px ${-parallaxOffset.y * PARALLAX_GRID_PX}px`,
  };
  const titleParallaxStyle = {
    transform: `translate(${parallaxOffset.x * PARALLAX_TITLE_PX}px, ${parallaxOffset.y * PARALLAX_TITLE_PX}px)`,
  };

  return (
    <div
      ref={containerRef}
      className={`relative min-h-screen w-full bg-[#0a0a0a] overflow-hidden dot-grid ${glitchActive ? "glitch-shake" : ""}`}
      style={gridBgStyle}
    >

      {/* ── Radial gradient backlight z-[-1] ── */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: -1,
          background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(100,20,100,0.28) 0%, rgba(80,10,60,0.12) 45%, transparent 75%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Canvas z-0 ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* ── Central text z-10 ── */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center pointer-events-none select-none">

        {/* Hollow ghost text above (mayesha.dev stroke signature) */}
        <p
          className="font-bold tracking-tight mb-1"
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(3rem, 8vw, 6rem)",
            lineHeight: 1,
            letterSpacing: "-0.05em",
            WebkitTextStroke: "1.5px rgba(255,255,255,0.25)",
            color: "transparent",
          }}
        >
          PROJECT
        </p>

        {/* Main title — gradient text Syne style + parallax */}
        <h1
          className="syne-heading gradient-text-cool"
          onClick={() => setShowMeaning(true)}
          style={{
            fontSize: "clamp(5rem, 13vw, 10rem)",
            filter: "drop-shadow(0 0 18px rgba(178,141,255,0.65)) drop-shadow(0 0 40px rgba(0,240,255,0.25))",
            cursor: "pointer",
            pointerEvents: "auto",
            transition: "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            ...titleParallaxStyle,
          }}
          title="Click to reveal meaning"
        >
          Oikya
        </h1>

        {/* Instruction */}
        <p className="mt-5 instruction-pulse"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <span style={{ color: "rgba(0,240,255,0.85)", marginRight: "8px" }}>[</span>
          DRAG ACROSS TO CREATE THE NETWORK
          <span style={{ color: "rgba(0,240,255,0.85)", marginLeft: "8px" }}>]</span>
        </p>
      </div>

      {/* ── HUD overlay z-50 ── */}
      <div className="absolute inset-0 z-50 pointer-events-none select-none">

        {/* Top-left: Neo-Brutalist metrics panel (mayesha-style card) */}
        <div className="absolute top-6 left-6">
          <div
            className="neo-card rounded-sm px-5 py-4"
            style={{ borderColor: "rgba(0,240,255,0.25)", boxShadow: "4px 4px 0px 0px rgba(0,240,255,0.15)" }}
          >
            {/* Panel label */}
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                color: "rgba(0,240,255,0.4)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              // System_Metrics
            </p>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px" }} className="space-y-2">
              <div className="flex items-center gap-2">
                <span style={{ color: "rgba(0,240,255,0.5)" }}>&gt;</span>
                <span style={{ width: "80px", color: "rgba(255,255,255,0.3)" }}>STATUS</span>
                <span style={{ color: "rgba(255,255,255,0.15)" }}>:</span>
                <span style={{ color: liveStatus === "UNIFIED" ? "#B28DFF" : "#00F0FF" }}>{liveStatus}</span>
              </div>
              <div className="flex items-center gap-2">
                <span style={{ color: "rgba(0,240,255,0.5)" }}>&gt;</span>
                <span style={{ width: "80px", color: "rgba(255,255,255,0.3)" }}>ENTITIES</span>
                <span style={{ color: "rgba(255,255,255,0.15)" }}>:</span>
                <span style={{ color: "#00F0FF" }}>40</span>
              </div>
              {liveStatus === "UNIFIED" ? (
                <>
                  <div className="flex items-center gap-2">
                    <span style={{ color: "rgba(0,240,255,0.5)" }}>&gt;</span>
                    <span style={{ width: "80px", color: "rgba(255,255,255,0.3)" }}>CONNECTIONS</span>
                    <span style={{ color: "rgba(255,255,255,0.15)" }}>:</span>
                    <span style={{ color: "#FF90E8" }}>{liveConnections}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: "rgba(0,240,255,0.5)" }}>&gt;</span>
                    <span style={{ width: "80px", color: "rgba(255,255,255,0.3)" }}>SYNERGY</span>
                    <span style={{ color: "rgba(255,255,255,0.15)" }}>:</span>
                    <span style={{ color: "#05C9AC" }}>{liveSynergy}%</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span style={{ color: "rgba(0,240,255,0.5)" }}>&gt;</span>
                  <span style={{ width: "80px", color: "rgba(255,255,255,0.3)" }}>PROTOCOL</span>
                  <span style={{ color: "rgba(255,255,255,0.15)" }}>:</span>
                  <span style={{ color: "#00F0FF" }}>WECD_2026</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top-right: MISSION label + floating status badge */}
        <div className="absolute top-6 right-6 flex flex-col items-end gap-4">

          {/* Floating badge (mayesha.dev rotating badge vibe — dark adaptation) */}
          <div
            className="float-badge neo-card rounded-sm px-3 py-1.5 flex items-center gap-2"
            style={{
              borderColor: "rgba(5,201,172,0.35)",
              boxShadow: "4px 4px 0px 0px rgba(5,201,172,0.12)",
              transform: "rotate(-2deg)",
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "#05C9AC", boxShadow: "0 0 6px #05C9AC" }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "#05C9AC",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              WECD 2026
            </span>
          </div>

          {/* Mission label */}
          <p
            className="mission-pulse"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "rgba(0,240,255,0.85)",
              filter: "drop-shadow(0 0 6px rgba(0,240,255,0.5))",
            }}
          >
            <span style={{ color: "rgba(0,240,255,0.5)", marginRight: "4px" }}>[</span>
            MISSION: BREAKING ISOLATION
            <span style={{ color: "rgba(0,240,255,0.5)", marginLeft: "4px" }}>]</span>
          </p>

          {/* L-frame corner accent */}
          <div
            style={{
              width: "40px",
              height: "40px",
              borderTop: "2px solid rgba(0,240,255,0.7)",
              borderRight: "2px solid rgba(0,240,255,0.7)",
              boxShadow: "3px -3px 18px rgba(0,240,255,0.5), inset -2px 2px 8px rgba(0,240,255,0.1)",
              filter: "drop-shadow(0 0 6px rgba(0,240,255,0.6))",
            }}
          />
        </div>

        {/* Bottom-left: magenta L-frame (mayesha pink) */}
        <div
          className="absolute bottom-6 left-6"
          style={{
            width: "40px",
            height: "40px",
            borderBottom: "2px solid rgba(255,144,232,0.7)",
            borderLeft: "2px solid rgba(255,144,232,0.7)",
            boxShadow: "-3px 3px 18px rgba(255,144,232,0.5), inset 2px -2px 8px rgba(255,144,232,0.1)",
            filter: "drop-shadow(0 0 6px rgba(255,90,200,0.6))",
          }}
        />

        {/* Bottom-right: REC indicator */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"
            style={{
              animation: "hud-blink 1.1s step-start infinite",
              boxShadow: "0 0 10px rgba(239,68,68,1), 0 0 20px rgba(239,68,68,0.5)",
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "rgba(255,180,180,0.85)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              filter: "drop-shadow(0 0 5px rgba(239,68,68,0.7))",
            }}
          >
            REC&nbsp;&nbsp;LIVE_SIMULATION
          </span>
        </div>

        {/* Bottom-center: "people behind the code" label — hollow Syne style */}
        <div
          className="absolute bottom-6 left-1/2"
          style={{ transform: "translateX(-50%)" }}
        >
          <p
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              WebkitTextStroke: "0.8px rgba(255,255,255,0.3)",
              color: "transparent",
            }}
          >
            PEOPLE BEHIND THE CODE
          </p>
        </div>

      </div>

      {/* ── Feature 3: Easter Egg CLI ── */}
      {cmdVisible && (
        <div
          className="cmd-slide-up"
          style={{
            position: "fixed",
            bottom: "56px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 200,
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(10, 10, 18, 0.92)",
              border: "1px solid rgba(0, 240, 255, 0.35)",
              borderRadius: "4px",
              padding: "8px 16px",
              boxShadow: "0 0 20px rgba(0,240,255,0.15), inset 0 0 15px rgba(0,0,0,0.4)",
              minWidth: "280px",
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                color: "#00F0FF",
                userSelect: "none",
                flexShrink: 0,
              }}
            >
              &gt;
            </span>
            <input
              ref={cmdInputRef}
              type="text"
              value={cmdText}
              onChange={(e) => setCmdText(e.target.value.toUpperCase())}
              onKeyDown={handleCmdKeyDown}
              spellCheck={false}
              autoComplete="off"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                color: "rgba(255,255,255,0.9)",
                background: "transparent",
                border: "none",
                outline: "none",
                width: "100%",
                caretColor: "#00F0FF",
                letterSpacing: "0.08em",
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                color: "#00F0FF",
                animation: "hud-blink 1s step-start infinite",
                flexShrink: 0,
              }}
            >
              _
            </span>
          </div>
        </div>
      )}

      {/* ── Meaning Popup ── */}
      {showMeaning && (
        <div
          className="absolute inset-0 z-[100] flex items-center justify-center"
          style={{ backdropFilter: "blur(4px)", background: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowMeaning(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(10,10,18,0.92)",
              border: "1px solid rgba(0,240,255,0.35)",
              boxShadow: "0 0 40px rgba(178,141,255,0.25), 0 0 80px rgba(0,240,255,0.1), inset 0 0 30px rgba(0,0,0,0.5)",
              borderRadius: "4px",
              padding: "36px 40px 32px",
              maxWidth: "420px",
              width: "90vw",
              position: "relative",
              animation: "popIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            {/* Corner accents */}
            <div style={{ position: "absolute", top: 0, left: 0, width: 18, height: 18, borderTop: "1.5px solid rgba(0,240,255,0.7)", borderLeft: "1.5px solid rgba(0,240,255,0.7)" }} />
            <div style={{ position: "absolute", top: 0, right: 0, width: 18, height: 18, borderTop: "1.5px solid rgba(0,240,255,0.7)", borderRight: "1.5px solid rgba(0,240,255,0.7)" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 18, height: 18, borderBottom: "1.5px solid rgba(255,144,232,0.7)", borderLeft: "1.5px solid rgba(255,144,232,0.7)" }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 18, height: 18, borderBottom: "1.5px solid rgba(255,144,232,0.7)", borderRight: "1.5px solid rgba(255,144,232,0.7)" }} />

            {/* Close button */}
            <button
              onClick={() => setShowMeaning(false)}
              style={{
                position: "absolute", top: 12, right: 14,
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", fontSize: "14px",
                color: "rgba(255,255,255,0.35)", lineHeight: 1,
              }}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Label */}
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", color: "rgba(0,240,255,0.5)", letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: "20px" }}>
              // LEXICON_ENTRY
            </p>

            {/* Bengali script */}
            <p style={{ fontFamily: "serif", fontSize: "clamp(3rem, 10vw, 4.5rem)", lineHeight: 1.1, color: "transparent", WebkitTextStroke: "1.5px rgba(255,255,255,0.85)", marginBottom: "8px", filter: "drop-shadow(0 0 12px rgba(178,141,255,0.5))" }}>
              ঐক্য
            </p>

            {/* Transliteration */}
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "22px", fontWeight: 700, color: "rgba(0,240,255,0.9)", letterSpacing: "0.08em", marginBottom: "16px" }}>
              Oikya  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", fontWeight: 400, fontFamily: "'JetBrains Mono', monospace" }}>/oi·kyo/</span>
            </p>

            {/* Divider */}
            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,240,255,0.3), transparent)", marginBottom: "16px" }} />

            {/* Definition */}
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: "12px" }}>
              <span style={{ color: "rgba(0,240,255,0.6)" }}>&gt;</span> <span style={{ color: "rgba(255,144,232,0.9)", fontWeight: 700 }}>noun</span> · Bengali (বাংলা)
            </p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "15px", color: "rgba(255,255,255,0.85)", lineHeight: 1.65, marginBottom: "18px" }}>
              <span style={{ color: "#B28DFF", fontWeight: 600 }}>1.</span> Unity; the state of being united or joined together.
              <br />
              <span style={{ color: "#B28DFF", fontWeight: 600 }}>2.</span> Solidarity; the bond formed between individuals through shared purpose.
            </p>

            {/* Etymology hint */}
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
              ↳ From Sanskrit <span style={{ color: "rgba(255,144,232,0.5)" }}>ऐक्य</span> (aikya) — <em>oneness</em>
            </p>
          </div>
        </div>
      )}
      {/* ── Boot Intro Overlay ── */}
      {!introDone && (
        <div
          className="absolute inset-0 z-[200] flex flex-col items-start justify-end p-8 pointer-events-none"
          style={{
            background: "#0a0a0a",
            opacity: introFading ? 0 : 1,
            transition: "opacity 0.8s ease-in-out",
          }}
        >
          <div className="flex flex-col gap-3">
            {introLines.map((line, idx) => (
              <p
                key={idx}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  color: "#00F0FF",
                  textShadow: "0 0 8px rgba(0,240,255,0.5)",
                }}
              >
                {line}
              </p>
            ))}
            {introLines.length < BOOT_LINES.length && (
              <p
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13px",
                  color: "#00F0FF",
                  animation: "hud-blink 0.8s step-start infinite",
                }}
              >
                _
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
