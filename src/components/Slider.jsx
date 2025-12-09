import React from 'react';

const Slider = ({ value, min = 0, max = 100, onChange, className = '' }) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={`relative w-full h-6 flex items-center select-none group ${className}`}>
            {/* Track Background */}
            <div className="absolute w-full h-1 bg-white/10 rounded-full overflow-hidden">
                {/* Fill */}
                <div
                    className="h-full bg-primary transition-all duration-100 ease-out"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>

            {/* Thumb (Native Input hidden but clickable) */}
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={onChange}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />

            {/* Visible Thumb (follower) */}
            <div
                className="absolute h-3 w-3 bg-primary rounded-full shadow-[0_0_10px_rgba(19,236,91,0.5)] pointer-events-none transition-all duration-100 ease-out group-hover:scale-125"
                style={{ left: `calc(${percentage}% - 6px)` }}
            ></div>
        </div>
    );
};

export default Slider;
