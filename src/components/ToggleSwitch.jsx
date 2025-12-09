import React from 'react';

const ToggleSwitch = ({ value, onToggle, label }) => {
    return (
        <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onToggle(!value)}
        >
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ease-in-out ${value ? 'bg-primary' : 'bg-white/10'}`}>
                <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${value ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
            {label && <span className="text-sm font-medium text-on-surface-variant-light dark:text-on-surface-variant-dark group-hover:text-primary transition-colors">{label}</span>}
        </div>
    );
};

export default ToggleSwitch;
