# Project Oikya — Breaking Isolation

![Next.js](https://img.shields.io/badge/Next.js-15%2B-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4%2B-06B6D4?logo=tailwind-css&logoColor=white)
![Canvas API](https://img.shields.io/badge/Graphics-Canvas_API-FF3333?logo=html5&logoColor=white)
![Web Audio](https://img.shields.io/badge/Audio-Web_Audio_API-000000?logo=audio-video&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

> "Unity is not uniformity." — Project Oikya is a living simulation of gender equity in tech, visualized through high-performance particle physics.

**Project Oikya** (ঐক্য) is an immersive, interactive legal/social art piece developed for **DEV WeCoded 2026**. It visualizes the historical "glass ceiling" in the tech industry. Entities possess identical capabilities, yet are artificially isolated by a systemic barrier—until **you** act as the catalyst to shatter it.

Built as a high-end experimental frontend project to explore Canvas-based generative art, procedural audio, and Cyber-HUD interaction design.

---

## Demo & Interaction Flow

```
User enters the simulation -> Boot sequence initializes systems
           |
  Entities move in isolation (Left: Male | Right: Female)
           |
  User DRAGS across the central vertical barrier 
           |
  "GLASS SHATTER" sequence triggers (80+ shards, shards gravity physics)
           |
  Barrier dissolves -> Protocol becomes "UNIFIED"
           |
  Inter-gender connections form a complex, glowing network
```

**Interaction Controls:**
- **Click "Oikya"**: Deep-dive into the project's semantic meaning and lore via a premium glassmorphic modal. Guided by a glowing, pulsing "CLICK TO DECRYPT THEME" UI hint.
- **Drag Barrier**: Shatter the systemic divide manually.
- **Control Center (Bottom-Left)**: 
    - `REBOOT_SYSTEM`: Full state reset with fresh boot logs and a glowing `CyberLoader` animation.
    - `Velocity_Factor`: Real-time avatar speed adjustment (0.5x – 3.0x).
    - `GLITCH_SYNC`: Manual trigger for visual sync glitches.
- **Sound Toggle**: High-fidelity ambient drone and interactive pings.

---

## Architecture

```mermaid
flowchart TD
    App[Next.js App Router] --> UI[Neo-Brutalist HUD Layer]
    App --> Simulation[Canvas Engine]
    Simulation --> Particles[Entity Physics & Procedural Avatars]
    Simulation --> Shards[Shatter Physics]
    Simulation --> Links[Dynamic Network Links]
    App --> Audio[Web Audio API Engine]
    Audio --> Drone[Ambient Drone]
    Audio --> Pings[Interactive Feedback]
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15+ | App Router for modern routing and performance optimization. |
| Styling | Tailwind CSS | Utility-first CSS for complex Neo-Brutalist and Cyber-HUD layouts. |
| Rendering | HTML5 Canvas API | High-performance particle physics and real-time shard animation. |
| Audio | Web Audio API | Procedural, low-latency ambient sounds and feedback pings. |
| Typography | Google Fonts | Space Grotesk, Syne, and JetBrains Mono for a professional coding aesthetic. |

---

## Technical Highlights

**High-Performance Sharding** — The glass shatter effect uses a dedicated shard pool with independent rotational velocity, gravity, and lifetime counters. This ensures 100+ high-fidelity triangles can explode without affecting framerates.

**Procedural Avatar Generation** — Instead of static images, entities are dynamically generated as complex SVGs at runtime, offering vast diversity in skin tones, hair styles, and clothing hues.

**Thematic Title Animation** — The main 'Oikya' text is driven by a React state effect that dynamically swaps the gendered colors (Cyan and Magenta) of the 'O' and 'a' letters every 5 seconds to physically reinforce the theme of interchanging gender roles.

**Procedural Audio Feedback** — Instead of static MP3s, the project uses procedural white noise filters and sine oscillator pings. This keeps the bundle size tiny while providing infinite variation in feedback sounds.

**Parallax Grid System** — The entire UI (Canvas + HUD + Grid) is wired to a normalized mouse parallax engine with lerped smoothing. This prevents "jitter" and gives the interface a premium, physical depth.

**Fast-Fail State Recovery** — The `handleRestart` logic performs a deep reset of both React state and `useRef` particle pools, ensuring a leak-free experience even after multiple re-initializations.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Modern Browser (Chrome/Safari/Edge)

### Installation

```bash
git clone https://github.com/rrubayet321/project-oikya.git
cd project-oikya

npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to act as the catalyst.

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 Rubayet Hassan

---

Built by [Rubayet Hassan](https://github.com/rrubayet321-)
