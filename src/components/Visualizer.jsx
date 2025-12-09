import React, { useEffect, useRef } from 'react';

const Visualizer = ({ analyser, isInteractive = false }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !analyser) return;

        const ctx = canvas.getContext('2d');
        // Tone.Analyser.getValue() returns Float32Array for waveform

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            const values = analyser.getValue(); // Float32Array
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            if (isInteractive) {
                // Interactive gradient fill
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, '#13ec5b');
                gradient.addColorStop(1, 'rgba(19, 236, 91, 0.2)');
                ctx.fillStyle = gradient;
                ctx.strokeStyle = '#13ec5b';
                ctx.lineWidth = 2;
            } else {
                ctx.strokeStyle = '#13ec5b';
                ctx.lineWidth = 2;
            }

            ctx.beginPath();

            const sliceWidth = width * 1.0 / values.length;
            let x = 0;

            if (isInteractive) {
                // Fill shape
                ctx.moveTo(0, height / 2);
                for (let i = 0; i < values.length; i++) {
                    const v = values[i]; // -1 to 1
                    const y = (v + 1) / 2 * height; // 0 to height (roughly)
                    // Clamp y
                    const clampedY = Math.max(0, Math.min(height, y));

                    if (i === 0) {
                        ctx.moveTo(x, clampedY);
                    } else {
                        ctx.lineTo(x, clampedY);
                    }
                    x += sliceWidth;
                }
                ctx.lineTo(width, height / 2);
                ctx.stroke();
                // Close path for fill if needed, but simple line is fine for now or fill below
            } else {
                // Simple line
                for (let i = 0; i < values.length; i++) {
                    const v = values[i];
                    const y = (v + 1) / 2 * height;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }
                ctx.stroke();
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [analyser, isInteractive]);

    return (
        <div className={`w-full h-full flex items-center justify-center ${isInteractive ? 'p-6' : 'p-6'} rounded-xl bg-transparent`}>
            <canvas
                ref={canvasRef}
                width={isInteractive ? 400 : 200}
                height={isInteractive ? 120 : 60}
                className="w-full h-full"
            />
        </div>
    );
};

export default Visualizer;
