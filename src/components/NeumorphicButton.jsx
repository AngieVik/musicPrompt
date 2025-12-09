import React from 'react';

const NeumorphicButton = ({ children, className = '', isInset = false, onClick, ...props }) => {
    return (
        <button
            className={`neumorphic-btn ${isInset ? 'inset' : ''} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};

export default NeumorphicButton;
