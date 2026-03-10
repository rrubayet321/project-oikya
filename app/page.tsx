"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import HeroWave from "@/components/ui/dynamic-wave-canvas-background";
import { SparklesText } from "@/components/ui/sparkles-text";

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

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const PARTICLE_COUNT = 40;
const LINK_DISTANCE = 130;
const SPEED = 3.2;
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
  const shardsRef = useRef<Shard[]>([]);
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

  // ── Audio refs & state ──
  const [isMuted, setIsMuted] = useState(false);
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
    if (isMuted) return;
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
  }, [isMuted]);

  const playPing = useCallback(() => {
    if (isMuted) return;
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
  }, [isMuted]);

  // Effect to handle muting the continuous drone
  useEffect(() => {
    if (droneGainRef.current) {
      droneGainRef.current.gain.setTargetAtTime(isMuted ? 0 : 0.03, audioCtxRef.current?.currentTime || 0, 0.1);
    }
  }, [isMuted]);

  const triggerBarrierBreak = useCallback((breakX?: number, breakY?: number) => {
    if (!wallBrokenRef.current) {
      wallBrokenRef.current = true;
      setLiveStatus("UNIFIED");
      initAudio();
      setTimeout(() => playShatter(), 50);

      const canvas = canvasRef.current;
      if (canvas) {
        const bx = breakX ?? canvas.width / 2;
        const by = breakY ?? canvas.height / 2;
        const newShards: Shard[] = [];
        const shardCount = 80;
        for (let i = 0; i < shardCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 15;
          const life = 60 + Math.random() * 80;
          const r = Math.random();
          const color = r < 0.33 ? "rgba(0,240,255," : r < 0.66 ? "rgba(255,144,232," : "rgba(255,255,255,";

          newShards.push({
            x: bx,
            y: by,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle: Math.random() * Math.PI * 2,
            vAngle: (Math.random() - 0.5) * 0.4,
            size: 2 + Math.random() * 8,
            life,
            maxLife: life,
            color,
          });
        }
        shardsRef.current = newShards; // Mount the shards!
      }
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
      // Feature 1: track mouse for hover detection
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (isDraggingRef.current && wallActiveRef.current) {
        wallActiveRef.current = false;
        triggerBarrierBreak(mouseX, mouseY);
      }

      mouseRef.current = { x: mouseX, y: mouseY };
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

      // ── Feature 4: Long-exposure motion trails ──
      const trailOpacity = wallActive ? 0.35 : 0.15;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0, 0, 0, ${trailOpacity})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      // ── Draw & Update Shards (Glass Shatter) ──
      const shards = shardsRef.current;
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.3; // gravity
        s.vx *= 0.95; // friction
        s.vy *= 0.95;
        s.angle += s.vAngle;
        s.life -= 1;

        if (s.life <= 0) {
          shards.splice(i, 1);
          continue;
        }

        const alpha = Math.max(0, s.life / s.maxLife);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        ctx.fillStyle = `${s.color}${alpha})`;
        ctx.shadowColor = `${s.color}${alpha})`;
        ctx.shadowBlur = 10;

        // Draw sharp triangles
        ctx.beginPath();
        ctx.moveTo(0, -s.size);
        ctx.lineTo(s.size, s.size);
        ctx.lineTo(-s.size, s.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

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
      className={`relative min-h-screen w-full overflow-hidden dot-grid ${glitchActive ? "glitch-shake" : ""}`}
      style={gridBgStyle}
    >
      {/* ── Solid Background Color z-[-3] ── */}
      <div className="absolute inset-0 bg-[#0a0a0a] z-[-3]" />

      {/* ── Dynamic Wave Background z-[-2] ── */}
      <HeroWave />

      {/* ── Radial gradient backlight z-[-1] ── */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: -1,
          background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(100,20,100,0.2) 0%, rgba(80,10,60,0.08) 45%, transparent 75%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Canvas z-0 ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* ── Central text z-10 (Fades out when broken) ── */}
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center pointer-events-none select-none transition-opacity duration-1000"
        style={{ opacity: liveStatus === "UNIFIED" ? 0 : 1 }}
      >

        {/* Artistic subtitle text */}
        <p
          className="tracking-widest mb-1"
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "clamp(0.85rem, 1.4vw, 1.05rem)",
            letterSpacing: "0.40em",
            color: "rgba(255,255,255,0.6)",
            textShadow: "0 0 10px rgba(255,144,232,0.2)",
          }}
        >
          THE INITIATIVE
        </p>

        {/* Main title — ultra-bold geometric header with Sparkles */}
        <div
          onClick={() => setShowMeaning(true)}
          style={{
            cursor: liveStatus === "UNIFIED" ? "default" : "pointer",
            pointerEvents: "auto",
            transition: "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            fontFamily: "var(--font-syne), sans-serif",
            fontWeight: 700,
            fontSize: "clamp(4.5rem, 8vw, 7.5rem)",
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
            filter: "drop-shadow(0 0 20px rgba(178,141,255,0.5)) drop-shadow(0 0 40px rgba(0,240,255,0.2))",
            ...titleParallaxStyle,
          }}
          title="Click to reveal meaning"
          role="button"
          aria-label="Click to reveal meaning of Oikya"
        >
          <SparklesText
            text="Oikya"
            colors={{ first: "#00F0FF", second: "#FF90E8" }}
            sparklesCount={12}
            className="gradient-text-cool"
          />
        </div>

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
              fontFamily: "var(--font-syne), sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(0,240,255,0.85)",
              filter: "drop-shadow(0 0 8px rgba(0,240,255,0.4))",
            }}
          >
            <span style={{ color: "rgba(0,240,255,0.4)", marginRight: "6px" }}>[</span>
            Mission: Breaking Isolation
            <span style={{ color: "rgba(0,240,255,0.4)", marginLeft: "6px" }}>]</span>
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
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "11px",
              letterSpacing: "0.3em",
              color: "rgba(255,255,255,0.3)",
              textShadow: "0 0 8px rgba(255,144,232,0.15)"
            }}
          >
            The People Behind The Code
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

      {/* ── Meaning Popup (Full-Screen Premium Modal) ── */}
      {showMeaning && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12 overflow-y-auto"
          style={{
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            background: "radial-gradient(ellipse at center, rgba(15, 12, 22, 0.7) 0%, rgba(5, 5, 8, 0.96) 100%)",
            animation: "popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
          onClick={() => setShowMeaning(false)}
        >
          {/* Internal Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl mx-auto flex flex-col md:flex-row rounded-lg overflow-hidden"
            style={{
              background: "rgba(10, 10, 15, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 1), 0 0 100px rgba(178, 141, 255, 0.12) inset",
              opacity: 0,
              animation: "popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards",
            }}
          >
            {/* Corner Bracket Accents */}
            <div style={{ position: "absolute", top: 0, left: 0, width: 32, height: 32, borderTop: "2px solid rgba(0,240,255,0.8)", borderLeft: "2px solid rgba(0,240,255,0.8)", zIndex: 10 }} />
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderBottom: "2px solid rgba(255,144,232,0.8)", borderRight: "2px solid rgba(255,144,232,0.8)", zIndex: 10 }} />

            {/* Close Button */}
            <button
              onClick={() => setShowMeaning(false)}
              className="absolute top-6 right-8 text-2xl transition-opacity hover:opacity-100 opacity-50 z-20"
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace",
                color: "#fff",
              }}
              aria-label="Close meaning popup"
            >
              ✕
            </button>

            {/* Left Col: Lexicon Entry */}
            <div className="md:w-5/12 p-8 md:p-14 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-center relative bg-black/40">
              {/* Subtle Cyan Glow */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{ background: "radial-gradient(circle at top left, #00F0FF 0%, transparent 70%)" }}
              />

              <div className="relative z-10 w-full">
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(0,240,255,0.7)", letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: "32px", borderBottom: "1px solid rgba(0,240,255,0.15)", paddingBottom: "10px", display: "inline-block" }}>
                  // LEXICON_ENTRY
                </p>

                {/* Bengali Script */}
                <h2 style={{ fontFamily: "serif", fontSize: "clamp(4.5rem, 12vw, 7.5rem)", lineHeight: 1, color: "transparent", WebkitTextStroke: "2px rgba(255,255,255,0.9)", marginBottom: "8px", filter: "drop-shadow(0 0 25px rgba(178,141,255,0.35))" }}>
                  ঐক্য
                </h2>

                {/* Phonetics */}
                <p className="mb-8" style={{ fontFamily: "'Syne', sans-serif", fontSize: "32px", fontWeight: 700, color: "rgba(0,240,255,0.95)", letterSpacing: "0.02em" }}>
                  Oikya  <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", fontWeight: 400, fontFamily: "'JetBrains Mono', monospace", marginLeft: "14px", verticalAlign: "middle" }}>/oi·kyo/</span>
                </p>

                {/* Definition Header */}
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.7, marginBottom: "16px" }}>
                  <span style={{ color: "rgba(0,240,255,0.8)" }}>&gt;</span> <span style={{ color: "rgba(255,144,232,0.9)", fontWeight: 700 }}>noun</span> · Bengali (বাংলা)
                </p>

                {/* Definitions */}
                <div className="space-y-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>
                  <p className="pl-4 border-l border-purple-500/30">
                    <span style={{ color: "#B28DFF", fontWeight: 600, marginRight: "8px" }}>1.</span>The state of being undeniably united.
                  </p>
                  <p className="pl-4 border-l border-purple-500/30">
                    <span style={{ color: "#B28DFF", fontWeight: 600, marginRight: "8px" }}>2.</span>A bond formed between distinct entities to create a unified system.
                  </p>
                </div>

                {/* Roots */}
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", marginTop: "40px" }}>
                  ↳ Root: Sanskrit <span style={{ color: "rgba(255,144,232,0.6)" }}>ऐक्य</span> (aikya) — <em>oneness</em>
                </p>
              </div>
            </div>

            {/* Right Col: Lore / Context */}
            <div className="md:w-7/12 p-8 md:p-14 flex flex-col justify-center relative bg-black/20">
              {/* Subtle Magenta Glow */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{ background: "radial-gradient(circle at bottom right, #FF90E8 0%, transparent 80%)" }}
              />

              <div className="relative z-10 w-full flex flex-col h-full justify-between">
                <div>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(255,144,232,0.7)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>
                    // THE_INITIATIVE: FRONTEND ART
                  </p>

                  <h3 className="mb-6" style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(2rem, 4vw, 2.5rem)", fontWeight: 800, lineHeight: 1.1, color: "#fff", letterSpacing: "-0.02em" }}>
                    Shattering the <span className="gradient-text-cool inline-block pr-1 shadow-magenta">Glass Ceiling</span>.
                  </h3>

                  <div className="space-y-6" style={{ fontFamily: "'Syne', sans-serif", fontSize: "19px", color: "rgba(255,255,255,0.9)", lineHeight: 1.6, fontWeight: 500 }}>
                    <p style={{ textShadow: "0 0 20px rgba(255,144,232,0.2)" }}>
                      Historically, the tech industry has operated in isolated silos. Women and men developers often existed within the same ecosystem, yet systemic barriers—the proverbial "glass ceiling"—kept their communities separated.
                    </p>
                    <p style={{ textShadow: "0 0 20px rgba(0,240,255,0.2)" }}>
                      <strong>Project Oikya</strong> is a living simulation of gender equity. Upon initialization, the entities run parallel but isolated. They possess the exact same capabilities, but the system code artificially prevents connection.
                    </p>
                    <p className="p-5 rounded-md border border-cyan-500/30 bg-black/40 text-white shadow-[0_0_30px_rgba(0,240,255,0.15)]" style={{ fontSize: "20px", fontWeight: 600 }}>
                      By dragging across the barrier, <em style={{ color: "#FF90E8", fontStyle: "normal", fontWeight: 800, textShadow: "0 0 15px rgba(255,144,232,0.6)" }}>you act as the catalyst</em>. The glass shatters. The network intertwines, forming a beautiful, unified canvas where boundaries no longer compute.
                    </p>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>DEVELOPED FOR</p>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: 700, color: "rgba(0,240,255,0.9)" }}>DEV WeCoded 2026</p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>CHALLENGE PROMPT</p>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "16px", fontWeight: 700, color: "rgba(255,144,232,0.9)" }}>Frontend Art: Gender Equity</p>
                  </div>
                </div>

              </div>
            </div>

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

      {/* ── Audio Toggle (Bottom Right) ── */}
      <div className="absolute bottom-6 right-6 z-50 pointer-events-auto">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="flex items-center gap-2 px-3 py-2 rounded-sm border transition-colors duration-200"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.2em",
            borderColor: isMuted ? "rgba(255, 107, 107, 0.4)" : "rgba(0, 240, 255, 0.3)",
            background: "rgba(10, 10, 10, 0.6)",
            backdropFilter: "blur(4px)",
            color: isMuted ? "rgba(255, 107, 107, 0.8)" : "rgba(0, 240, 255, 0.8)",
          }}
          aria-label={isMuted ? "Unmute sound" : "Mute sound"}
        >
          <span>[</span>
          <span>SOUND: {isMuted ? "OFF" : "ON"}</span>
          <span>]</span>
        </button>
      </div>

    </div>
  );
}
