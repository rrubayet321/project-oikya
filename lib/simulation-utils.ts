export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    side: "left" | "right";
    radius: number;
    role: string;
}

export interface Shard {
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

export const PARTICLE_COUNT = 40;
export const LINK_DISTANCE = 130;
export const SPEED = 3.2;
export const RADIUS = 11;
export const CYAN = "#00F0FF";
export const MAGENTA = "#FF90E8";
export const AVATAR_SIZE = 22;
export const HOVER_HIT_RADIUS = 22;
export const PARALLAX_FACTOR = 0.05;
export const PARALLAX_CANVAS_PX = 8;
export const PARALLAX_TITLE_PX = 6;
export const PARALLAX_GRID_PX = 4;

export const TECH_ROLES = [
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

export const MALE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
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

export const FEMALE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
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

export function svgToDataUrl(svgStr: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
}

export function makeParticle(side: "left" | "right", w: number, h: number): Particle {
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

export function roundRect(
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
