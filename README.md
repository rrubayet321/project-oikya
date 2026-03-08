<div align="center">
  <br />
  <h1 align="center">PROJECT OIKYA <br/> <code>[ ঐক্য ]</code></h1>
  <p align="center">
    <strong>An interactive frontend art piece celebrating the people behind the code.</strong><br>
    <em>Built for the DEV.to WeCoded 2026 Challenge.</em>
  </p>
  <br />
  <p align="center">
    <a href="https://github.com/rrubayet321/project-oikya/commits/main">
      <img alt="Commits" src="https://img.shields.io/github/commit-activity/m/rrubayet321/project-oikya?color=00F0FF&style=flat-square">
    </a>
    <a href="https://nextjs.org/">
      <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15.0-black?style=flat-square&logo=next.js&color=0a0a0a" />
    </a>
    <a href="https://tailwindcss.com/">
      <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&color=00F0FF" />
    </a>
  </p>
</div>

<br />

> **Oikya** (/oi·kyo/) — Bengali for *unity* or *solidarity*. From the Sanskrit *aikya* (oneness).

Project Oikya is a living, interactive canvas that uses a particle physics simulation to visualize the historical and systemic gender divide in the tech industry—and the powerful unity that forms when we break those barriers down.

Wrapped in a **Gen-Z Hacker / Cyber-Data HUD** aesthetic, the application invites users to act as the catalyst for change.

<br />

## 👁️ The Simulation

### `STATE_01: ISOLATION`
Upon initialization, 40 pixel-art entities (representing male and female developers) are strictly separated by an invisible vertical barrier. They move, but they cannot connect.

### `CATALYST_EVENT: DRAG_TO_BREAK`
The user's interaction—clicking and dragging across the center barrier—acts as the catalyst. The invisible wall shatters.

### `STATE_02: UNIFIED_NETWORK`
Once broken, the entities freely intermix. The system dynamically draws glowing, gradient network links (cyan to purple to magenta) between nearby avatars. The isolated silos transform into a single, vibrant, and equal community.

<br />

## ⚡ Features & Interactivity

- **Dynamic HUD Metrics:** The system overlays feature a reactive "Neo-Brutalist" dashboard tracking real-time data: `ENTITIES`, live `CONNECTIONS`, and overall `SYNERGY %`.
- **Procedural Audio (Web Audio API):**
  - Ambient detuned drone (55Hz / 55.4Hz) indicating system energy.
  - Generative "glass shatter" noise burst on barrier break.
  - Soft, randomized sine pings (800Hz - 1400Hz) when new cross-connections form.
- **Micro-Interactions:**
  - **Hover Tooltips:** Hovering over any entity freezes its movement, enhances its glow, and reveals its randomly assigned technical role (e.g., `[ROLE: AI_RESEARCHER]`, `[ROLE: DEVOPS]`).
  - **Lexicon Popup:** Clicking the massive, gradient-shifting "Oikya" title reveals a frosted-glass overlay explaining the word's etymology.
- **Smooth Mouse Parallax:** The entire canvas, dot-grid background, and title text shift subtly based on mouse position using lerp interpolation for a premium sense of depth.
- **Easter Egg CLI:** A hidden command-line interface (`> _`). Typing `EXECUTE OIKYA` triggers a system overwrite, breaking the barrier programmatically with a CSS glitch-shake animation.

<br />

## 🛠️ Stack & Architecture

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Strictly utility-centric, no standard CSS files beyond globals)
- **Engine:** Built from scratch on native HTML5 `<canvas>` using the `requestAnimationFrame` API for 60FPS particle physics, collision detection, and parallax interpolation.
- **Aesthetic DNA:** Deep blacks (`#0a0a0a`), Neon Cyan (`#00F0FF`), Neon Magenta (`#FF90E8`), strict Monospace typing (`JetBrains Mono`), and frosted glass frames.

<br />

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/rrubayet321/project-oikya.git

# Navigate into the directory
cd project-oikya

# Install dependencies
npm install

# Boot the simulation
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the project.

---

<div align="center">
  <p><i>"Breaking isolation, one connection at a time."</i></p>
  <p>Built for the DEV.to WeCoded challenge.</p>
</div>
