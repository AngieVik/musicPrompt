import React from 'react';

const GlassButton = ({ children, className = '', isInset = false, isActive = false, onClick, ...props }) => {
    // bg-white/5 border border-white/10 active:bg-primary/20 backdrop-blur-md
    const baseClasses = "flex items-center justify-center rounded-full transition-all duration-300 ease-in-out border border-white/10 backdrop-blur-md cursor-pointer select-none ring-offset-2 ring-offset-black/50 focus:outline-none focus:ring-1 focus:ring-primary/50";

    // Different styles based on "inset" (simulating active state) or normal
    // If isActive is passed, we force the "active" look (e.g. for tabs)
    const stateClasses = (isInset || isActive)
        ? "bg-primary/20 text-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
        : "bg-white/5 text-on-surface-light dark:text-on-surface-dark hover:bg-white/10 active:scale-95";

    return (
        <button
            className={`${baseClasses} ${stateClasses} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};

export default GlassButton;
