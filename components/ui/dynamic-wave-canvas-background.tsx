"use client";

import React, { useEffect, useRef } from "react";

const HeroWave = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        let width: number, height: number, imageData: ImageData, data: Uint8ClampedArray;
        const SCALE = 2; // Pixelation scale

        const resizeCanvas = () => {
            width = Math.floor(window.innerWidth / SCALE);
            height = Math.floor(window.innerHeight / SCALE);
            canvas.width = width;
            canvas.height = height;
            imageData = ctx.createImageData(width, height);
            data = imageData.data;
        };

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        const startTime = Date.now();

        // Precompute sine/cosine tables for fast rendering
        const SIN_TABLE = new Float32Array(1024);
        const COS_TABLE = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) {
            const angle = (i / 1024) * Math.PI * 2;
            SIN_TABLE[i] = Math.sin(angle);
            COS_TABLE[i] = Math.cos(angle);
        }

        const fastSin = (x: number) => {
            let val = x % (Math.PI * 2);
            if (val < 0) val += Math.PI * 2;
            const index = Math.floor((val / (Math.PI * 2)) * 1024) & 1023;
            return SIN_TABLE[index];
        };

        const fastCos = (x: number) => {
            let val = x % (Math.PI * 2);
            if (val < 0) val += Math.PI * 2;
            const index = Math.floor((val / (Math.PI * 2)) * 1024) & 1023;
            return COS_TABLE[index];
        };

        let animationFrameId: number;

        const render = () => {
            const time = (Date.now() - startTime) * 0.001;

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const u_x = (2 * x - width) / height;
                    const u_y = (2 * y - height) / height;

                    let a = 0;
                    let d = 0;

                    // Wave distortion passes
                    for (let i = 0; i < 4; i++) {
                        a += fastCos(i - d + time * 0.5 - a * u_x);
                        d += fastSin(i * u_y + a);
                    }

                    const wave = (fastSin(a) + fastCos(d)) * 0.5;
                    const intensity = 0.15 + 0.25 * wave;

                    // Adjusted color palette to match Project Oikya theme
                    const baseVal = 0.05 + 0.1 * fastCos(u_x + u_y + time * 0.3);
                    const cyanAccent = 0.25 * fastSin(a * 1.5 + time * 0.2);
                    const magentaAccent = 0.25 * fastCos(d * 2 + time * 0.1);

                    const r = Math.max(0, Math.min(1, baseVal + magentaAccent * 1.2)) * intensity;
                    const g = Math.max(0, Math.min(1, baseVal + cyanAccent * 1.2)) * intensity;
                    const b = Math.max(0, Math.min(1, baseVal + cyanAccent * 1.5 + magentaAccent * 1.2)) * intensity;

                    const index = (y * width + x) * 4;

                    data[index] = r * 255;
                    data[index + 1] = g * 255;
                    data[index + 2] = b * 255;
                    data[index + 3] = 255;             // Alpha
                }
            }

            ctx.putImageData(imageData, 0, 0);

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-[-2] opacity-40" style={{ imageRendering: 'pixelated' }} />;
};

export default HeroWave;
