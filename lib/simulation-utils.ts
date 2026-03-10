export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    side: "left" | "right";
    radius: number;
    role: string;
    avatarDataUrl: string;
    img?: HTMLImageElement;
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

const SKIN_TONES = [
    "#FFDCB6", "#E5B887", "#CE965F", "#B57134", "#915016",
    "#50280B", "#F8D9C0", "#E0AC69", "#8D5524", "#3D2210"
];

const HAIR_COLORS = [
    "#090806", "#2C222B", "#71635A", "#B7A69E", "#D6C4C2",
    "#CABFB1", "#DCD0BA", "#FFF5E1", "#E6CEA8", "#E5C8A8",
    "#DEBC99", "#A56B46", "#B55239", "#8D4A43", "#533D32",
    "#3B3024", "#554838", "#4E433F", "#A0213E"
];

const CYAN_HUES = [
    "#00F0FF", "#00D1FF", "#00A3FF", "#00FFFF", "#3B82F6", "#2563EB"
];

const MAGENTA_HUES = [
    "#FF90E8", "#D946EF", "#C026D3", "#EC4899", "#DB2777", "#F472B6"
];

export function generateAvatarSVG(side: "left" | "right"): string {
    const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const hair = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)];
    const isLeft = side === "left";

    // Pick clothing color based on side
    const clothesBase = isLeft
        ? CYAN_HUES[Math.floor(Math.random() * CYAN_HUES.length)]
        : MAGENTA_HUES[Math.floor(Math.random() * MAGENTA_HUES.length)];
    const clothesDark = isLeft ? "#2563EB" : "#DB2777"; // fallback shading

    // Generate random hair style variations (0 to 2)
    const hairStyle = Math.floor(Math.random() * 3);

    // Male-ish / Female-ish shapes can be mixed for true diversity, or keep distinct structural bases.
    // For visual distinctiveness between left and right groups initially, we'll keep the base 
    // structures slightly varied but fully diverse in color.

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
      <rect x="3" y="10" width="10" height="6" fill="${clothesBase}"/>
      <rect x="5" y="10" width="6" height="2" fill="${clothesDark}"/>
      <rect x="6" y="8" width="4" height="2" fill="${skin}"/>
      <rect x="4" y="3" width="8" height="7" fill="${skin}"/>
    `;

    // Eye color
    const eyeColor = isLeft ? "#60A5FA" : "#F472B6";
    svg += `<rect x="5" y="6" width="1" height="1" fill="${eyeColor}"/>
            <rect x="10" y="6" width="1" height="1" fill="${eyeColor}"/>
            <rect x="6" y="9" width="4" height="1" fill="#92400E"/>
            <rect x="6" y="12" width="4" height="2" fill="${clothesDark}"/>
           `;

    if (isLeft) {
        // Base hair for left entities
        svg += `
          <rect x="4" y="2" width="2" height="2" fill="${hair}"/>
          <rect x="6" y="1" width="2" height="3" fill="${hair}"/>
          <rect x="8" y="2" width="2" height="2" fill="${hair}"/>
          <rect x="10" y="1" width="2" height="3" fill="${hair}"/>
        `;
        if (hairStyle === 1) {
            svg += `
              <rect x="4" y="6" width="3" height="2" fill="${hair}"/>
              <rect x="9" y="6" width="3" height="2" fill="${hair}"/>
            `;
        } else if (hairStyle === 2) {
            svg += `<rect x="7" y="7" width="2" height="1" fill="${hair}"/>`;
        }
    } else {
        // Base hair for right entities
        svg += `
          <rect x="3" y="2" width="10" height="3" fill="${hair}"/>
          <rect x="3" y="5" width="2" height="5" fill="${hair}"/>
          <rect x="11" y="5" width="2" height="5" fill="${hair}"/>
        `;
        if (hairStyle === 1) {
            svg += `
              <rect x="4" y="6" width="3" height="2" fill="${hair}"/>
              <rect x="9" y="6" width="3" height="2" fill="${hair}"/>
            `;
        }
    }

    svg += `</svg>`;
    return svg;
}

export function svgToDataUrl(svgStr: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
}

export function makeParticle(side: "left" | "right", w: number, h: number): Particle {
    const half = w / 2;
    const angle = Math.random() * Math.PI * 2;
    const svgStr = generateAvatarSVG(side);
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
        avatarDataUrl: svgToDataUrl(svgStr),
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
