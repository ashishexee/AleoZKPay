import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScratchRevealProps {
    children: React.ReactNode;
    onReveal?: () => void;
}

export const ScratchReveal: React.FC<ScratchRevealProps> = ({ children, onReveal }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = container.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;

        // Draw silver metallic scratch-off covering
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#888');
        gradient.addColorStop(0.5, '#ccc');
        gradient.addColorStop(1, '#666');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Add some noise/texture
        for (let i = 0; i < 2000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
            ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
        }

        // Add "Scratch to Reveal" text
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SCRATCH TO REVEAL', width / 2, height / 2);
    }, []);

    const scratch = (clientX: number, clientY: number) => {
        if (isRevealed) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 35, 0, Math.PI * 2);
        ctx.fill();

        checkReveal();
    };

    const checkReveal = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let transparentPixels = 0;

        // Check alpha channel for transparency
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] === 0) transparentPixels++;
        }

        const totalPixels = pixels.length / 4;
        const fractionRevealed = transparentPixels / totalPixels;

        if (fractionRevealed > 0.4) {
            setIsRevealed(true);
            if (onReveal) onReveal();
        }
    };

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        if ('touches' in e) scratch(e.touches[0].clientX, e.touches[0].clientY);
        else scratch(e.clientX, e.clientY);
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        if ('touches' in e) scratch(e.touches[0].clientX, e.touches[0].clientY);
        else scratch(e.clientX, e.clientY);
    };

    const handleEnd = () => setIsDrawing(false);

    return (
        <div ref={containerRef} className="relative w-full h-full rounded-2xl overflow-hidden cursor-crosshair">
            {children}
            <AnimatePresence>
                {!isRevealed && (
                    <motion.canvas
                        ref={canvasRef}
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-0 w-full h-full z-20 touch-none rounded-2xl"
                        onMouseDown={handleStart}
                        onMouseMove={handleMove}
                        onMouseUp={handleEnd}
                        onMouseLeave={handleEnd}
                        onTouchStart={handleStart}
                        onTouchMove={handleMove}
                        onTouchEnd={handleEnd}
                        onTouchCancel={handleEnd}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
