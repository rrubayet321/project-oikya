import { useEffect, useRef, useState } from "react";

interface EasterEggCLIProps {
    showMeaning: boolean;
    introDone: boolean;
    onExecuteOikya: () => void;
}

export function EasterEggCLI({ showMeaning, introDone, onExecuteOikya }: EasterEggCLIProps) {
    const [cmdVisible, setCmdVisible] = useState(false);
    const [cmdText, setCmdText] = useState("");
    const cmdInputRef = useRef<HTMLInputElement>(null);

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
                // e.preventDefault();
            }

            if (e.key === "Escape") {
                setCmdVisible(false);
                setCmdText("");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cmdVisible, showMeaning, introDone]);

    const handleCmdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            if (cmdText.trim() === "EXECUTE OIKYA") {
                onExecuteOikya();
            }
            setCmdVisible(false);
            setCmdText("");
        } else if (e.key === "Escape") {
            setCmdVisible(false);
            setCmdText("");
        }
    };

    if (!cmdVisible) return null;

    return (
        <div className="absolute top-0 left-0 w-full p-4 z-50 pointer-events-auto">
            <div className="max-w-xl mx-auto neo-card bg-black/90 p-3 flex items-center gap-3 border border-[#FF90E8]/40 shadow-[0_0_15px_rgba(255,144,232,0.15)] animate-in slide-in-from-top-4 fade-in duration-300">
                <span className="text-[#FF90E8] font-mono font-bold">{`SYS_ADMIN@OIKYA ~ %`}</span>
                <input
                    ref={cmdInputRef}
                    type="text"
                    value={cmdText}
                    onChange={(e) => setCmdText(e.target.value.toUpperCase())}
                    onKeyDown={handleCmdKeyDown}
                    onBlur={() => {
                        setCmdVisible(false);
                        setCmdText("");
                    }}
                    className="bg-transparent border-none outline-none text-[#00F0FF] font-mono flex-1 caret-[#FF90E8] uppercase tracking-widest placeholder-white/20"
                    placeholder="ENTER OVERRIDE PROTOCOL..."
                    spellCheck={false}
                    autoComplete="off"
                />
            </div>
        </div>
    );
}
