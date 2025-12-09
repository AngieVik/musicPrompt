import React from 'react';

const RangeSlider = ({ label, id, value, min = -12, max = 12, onChange }) => (
    <div className="flex flex-col gap-1 w-full">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }} htmlFor={id}>{label}</label>
        <div className="relative flex items-center w-full">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{min}</span>
            <input
                className="w-full mx-2"
                id={id}
                max={max}
                min={min}
                type="range"
                value={value}
                onChange={onChange}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{max}</span>
        </div>
    </div>
);

export default RangeSlider;
