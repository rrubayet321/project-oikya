import { useEffect, useState, useRef } from "react";

interface IntroBootSequenceProps {
    onComplete?: () => void;
}

const BOOT_LINES = [
    "> INITIALIZING OIKYA_PROTOCOL v2.26...",
    "> LOADING 40 ENTITIES...",
    "> BARRIER: ██████████ ACTIVE",
    "> GENDER_DIVIDE_SIMULATION: READY",
    "> AWAITING HUMAN CATALYST...",
];

export function IntroBootSequence({ onComplete }: IntroBootSequenceProps) {
    const [introLines, setIntroLines] = useState<string[]>([]);
    const [introFading, setIntroFading] = useState(false);
    const [introDone, setIntroDone] = useState(false);

    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < BOOT_LINES.length) {
                setIntroLines((prev) => [...prev, BOOT_LINES[i]]);
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => setIntroFading(true), 600);
                setTimeout(() => {
                    setIntroDone(true);
                    onCompleteRef.current?.();
                }, 1400);
            }
        }, 420);
        return () => clearInterval(interval);
    }, []);

    if (introDone) return null;

    return (
        <div
            className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-700 ease-in-out ${introFading ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
        >
            <div className="text-left w-full max-w-lg px-6 font-mono text-[#00F0FF] text-sm md:text-base leading-relaxed tracking-wider drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                {introLines.map((line, idx) => (
                    <div key={idx} className="mb-2 animate-pulse-fast">
                        {line}
                    </div>
                ))}
                {introLines.length < BOOT_LINES.length && (
                    <div className="inline-block w-3 h-5 bg-[#00F0FF] animate-blink ml-1 align-middle opacity-80" />
                )}
            </div>
        </div>
    );
}
