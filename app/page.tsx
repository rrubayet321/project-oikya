"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import HeroWave from "@/components/ui/dynamic-wave-canvas-background";
import { SparklesText } from "@/components/ui/sparkles-text";

import {
  Particle,
  Shard,
  PARTICLE_COUNT,
  LINK_DISTANCE,
  SPEED,
  CYAN,
  MAGENTA,
  AVATAR_SIZE,
  HOVER_HIT_RADIUS,
  PARALLAX_FACTOR,
  PARALLAX_CANVAS_PX,
  PARALLAX_TITLE_PX,
  PARALLAX_GRID_PX,
  svgToDataUrl,
  makeParticle,
  roundRect
} from "@/lib/simulation-utils";
import { IntroBootSequence } from "@/components/simulation/IntroBootSequence";
import { EasterEggCLI } from "@/components/ui/EasterEggCLI";

// ── Main page ──────────────────────────────────────────────────────────────
export default function Home() {
  const [showMeaning, setShowMeaning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shardsRef = useRef<Shard[]>([]);
  const wallActiveRef = useRef(true);
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  // ── Feature 1: Hover tooltip refs ──
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredIndexRef = useRef<number>(-1);
  const tooltipOpacityRef = useRef(0);

  // ── Feature 2: Parallax refs ──
  const rawMouseRef = useRef<{ nx: number; ny: number }>({ nx: 0, ny: 0 });
  const smoothParallaxRef = useRef<{ nx: number; ny: number }>({ nx: 0, ny: 0 });
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });

  // ── Feature 3: Easter egg CLI state ──
  const [glitchActive, setGlitchActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const [bootKey, setBootKey] = useState(0);
  const [speedFactor, setSpeedFactor] = useState(1.0);

  // Animate the main Oikya text to swap colors every 5s
  const [swapOikya, setSwapOikya] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setSwapOikya(prev => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Images are generated per-particle now.

  const initParticles = useCallback((w: number, h: number, speed: number = SPEED) => {
    const p: Particle[] = [];
    const makeP = (side: "left" | "right") => {
      const p = makeParticle(side, w, h);
      p.vx *= (speed / SPEED);
      p.vy *= (speed / SPEED);

      const img = new Image();
      img.src = p.avatarDataUrl;
      p.img = img;

      return p;
    };
    for (let i = 0; i < PARTICLE_COUNT / 2; i++) p.push(makeP("left"));
    for (let i = 0; i < PARTICLE_COUNT / 2; i++) p.push(makeP("right"));
    return p;
  }, []);


  const handleRestart = useCallback(() => {
    setIntroDone(false);
    setBootKey(prev => prev + 1);
    wallActiveRef.current = true;
    wallBrokenRef.current = false;
    setLiveStatus("AWAITING_CATALYST");
    setLiveConnections(0);
    setLiveSynergy(0);
    shardsRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      particlesRef.current = initParticles(canvas.width, canvas.height, SPEED * speedFactor);
    }
  }, [initParticles, speedFactor]);

  const handleIntroComplete = useCallback(() => {
    setIntroDone(true);
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


  // ── Main canvas animation ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = initParticles(canvas.width, canvas.height, SPEED * speedFactor);
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

        const size = p.radius * 2;
        const img = p.img;
        if (img && img.complete) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, p.x - half, p.y - half, AVATAR_SIZE, AVATAR_SIZE);
        } else {
          // fallback
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
          background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,25,40,0.15) 0%, rgba(0,10,20,0.08) 45%, transparent 75%)",
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
          className="tracking-widest mb-2"
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 500,
            textTransform: "uppercase",
            fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)",
            letterSpacing: "0.45em",
            color: "rgba(255,255,255,0.85)",
            textShadow: "0 0 12px rgba(255,144,232,0.4)",
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
            text={
              <span className="flex items-baseline">
                <span
                  style={{
                    color: swapOikya ? MAGENTA : CYAN,
                    transition: "color 1s ease-in-out, text-shadow 1s ease-in-out",
                    textShadow: `0 0 30px ${swapOikya ? "rgba(255,144,232,0.6)" : "rgba(0,240,255,0.6)"}`
                  }}
                >
                  O
                </span>
                <span className="gradient-text-cool px-[1px]">iky</span>
                <span
                  style={{
                    color: swapOikya ? CYAN : MAGENTA,
                    transition: "color 1s ease-in-out, text-shadow 1s ease-in-out",
                    textShadow: `0 0 30px ${swapOikya ? "rgba(0,240,255,0.6)" : "rgba(255,144,232,0.6)"}`
                  }}
                >
                  a
                </span>
              </span>
            }
            colors={{ first: "#00F0FF", second: "#FF90E8" }}
            sparklesCount={12}
            className=""
          />
        </div>

        {/* Click Hint */}
        <p
          className="mt-4 text-[11px] uppercase tracking-[0.4em] text-white/70 transition-all duration-300 hover:text-white pointer-events-auto cursor-pointer flex items-center gap-2"
          onClick={() => setShowMeaning(true)}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            textShadow: "0 0 10px rgba(255,255,255,0.3)"
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#FF90E8]/70 animate-pulse shadow-[0_0_8px_rgba(255,144,232,0.6)]"></span>
          CLICK TO DECRYPT THEME
          <span className="w-2 h-2 rounded-full bg-[#00F0FF]/70 animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.6)]"></span>
        </p>

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

        {/* Bottom-center: Footer Attribution */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center select-none pointer-events-none">
          <p
            className="mb-1"
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "11px",
              letterSpacing: "0.4em",
              color: "rgba(255,255,255,0.3)",
              textShadow: "0 0 8px rgba(255,144,232,0.15)",
              textAlign: "center"
            }}
          >
            The People Behind The Code
          </p>
          <a
            href="https://github.com/rrubayet321-"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 transition-all duration-500 hover:scale-105 pointer-events-auto"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "rgba(0, 240, 255, 0.7)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textDecoration: "none",
              textShadow: "0 0 10px rgba(0, 240, 255, 0.4), 0 0 20px rgba(0, 240, 255, 0.2)",
            }}
            aria-label="View developer GitHub profile"
          >
            <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor" className="drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            <span className="hover:text-white transition-colors duration-300">Built by rrubayet321-</span>
          </a>
        </div>

        {/* Bottom-left: Control Center Panel */}
        <div className="absolute bottom-24 left-6 pointer-events-auto">
          <div
            className="neo-card rounded-sm px-4 py-3 min-w-[200px] transition-all duration-300 border-[rgba(178,141,255,0.3)] bg-[rgba(10,10,15,0.8)] shadow-[4px_4px_0px_0px_rgba(178,141,255,0.1)] hover:shadow-[0_0_25px_rgba(178,141,255,0.4),4px_4px_0px_0px_rgba(178,141,255,0.1)] hover:border-[rgba(178,141,255,0.6)]"
          >
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                color: "rgba(178,141,255,0.6)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "12px",
                borderBottom: "1px solid rgba(178,141,255,0.1)",
                paddingBottom: "4px",
              }}
            >
              // Control_Center
            </p>

            <div className="space-y-4">
              {/* Restart Button */}
              <button
                onClick={handleRestart}
                className="w-full py-2 px-3 flex items-center justify-between border border-dashed border-white/20 hover:border-[#00F0FF]/50 transition-colors group"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}
                aria-label="Restart Simulation"
              >
                <span className="text-white/40 group-hover:text-[#00F0FF]/80 transition-colors">REBOOT_SYSTEM</span>
                <span className="text-[#00F0FF]">⟳</span>
              </button>

              {/* Speed Control */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] font-mono text-white/30 uppercase tracking-wider">
                  <span>Velocity_Factor</span>
                  <span className="text-[#B28DFF]">{speedFactor.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={speedFactor}
                  onChange={(e) => {
                    const newFactor = parseFloat(e.target.value);
                    const ratio = newFactor / speedFactor;
                    particlesRef.current.forEach(p => {
                      p.vx *= ratio;
                      p.vy *= ratio;
                    });
                    setSpeedFactor(newFactor);
                  }}
                  className="w-full accent-[#B28DFF] cursor-pointer"
                  style={{ height: "4px" }}
                />
              </div>

              {/* Glitch Trigger */}
              <button
                onClick={() => {
                  setGlitchActive(true);
                  setTimeout(() => setGlitchActive(false), 500);
                }}
                className="w-full py-2 px-3 flex items-center justify-between border border-dashed border-white/20 hover:border-[#FF90E8]/50 transition-colors group"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}
                aria-label="Trigger Glitch Effect"
              >
                <span className="text-white/40 group-hover:text-[#FF90E8]/80 transition-colors">GLITCH_SYNC</span>
                <span className="text-[#FF90E8]">↯</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Feature 3: Easter Egg CLI ── */}
      {/* ── Feature 3: Easter Egg CLI ── */}
      <EasterEggCLI
        showMeaning={showMeaning}
        introDone={introDone}
        onExecuteOikya={() => {
          wallActiveRef.current = false;
          triggerBarrierBreak();
          setGlitchActive(true);
          setTimeout(() => setGlitchActive(false), 500);
        }}
      />

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
      <IntroBootSequence key={bootKey} onComplete={handleIntroComplete} />

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
