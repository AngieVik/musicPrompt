import React, { useState, useEffect } from 'react';

export const ToggleSwitch = ({ initial = false, onToggle }) => {
    const [on, setOn] = useState(initial);

    useEffect(() => {
        setOn(initial);
    }, [initial]);

    const handleClick = () => {
        const newState = !on;
        setOn(newState);
        if (onToggle) onToggle(newState);
    };

    return (
        <div onClick={handleClick} className="relative w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer">
            <div
                className={`absolute left-0 top-0 w-6 h-6 rounded-full shadow-md transform transition-transform`}
                style={{
                    transform: on ? 'translateX(100%)' : 'translateX(0)',
                    backgroundColor: 'var(--primary)'
                }}
            ></div>
        </div>
    );
};

export const SmallToggleSwitch = ({ initial = false, onToggle }) => {
    const [active, setActive] = useState(initial);

    useEffect(() => {
        setActive(initial);
    }, [initial]);

    const handleClick = () => {
        const newState = !active;
        setActive(newState);
        if (onToggle) onToggle(newState);
    };

    return (
        <div onClick={handleClick} className={`w-10 h-5 rounded-full cursor-pointer relative transition-colors ${active ? '' : 'bg-gray-200 dark:bg-gray-700'}`} style={{ backgroundColor: active ? 'var(--primary)' : '' }}>
            <div
                className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform`}
                style={{
                    transform: active ? 'translateX(100%)' : 'translateX(0)',
                }}
            ></div>
        </div>
    );
};
