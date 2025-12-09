import React from 'react';
import GlassButton from './GlassButton';

const MiniPlayer = ({ track, isPlaying, onPlayPause, onExpand }) => {
    if (!track) return null;

    return (
        <div
            className="h-20 w-full flex items-center justify-between px-4 gap-4 glass-panel border-t border-white/10 relative z-20 cursor-pointer backdrop-blur-xl bg-black/40"
            onClick={onExpand}
        >
            {/* Track Info */}
            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <div
                    className="h-12 w-12 rounded-lg bg-cover bg-center shrink-0 border border-white/10"
                    style={{ backgroundImage: track.picture ? `url("${track.picture}")` : 'none', backgroundColor: !track.picture ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >
                    {!track.picture && <span className="flex items-center justify-center w-full h-full material-symbols-outlined text-white/50">music_note</span>}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">{track.name}</span>
                    <span className="text-xs text-white/60 truncate">{track.artist}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
                <GlassButton
                    className="h-10 w-10 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                    onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
                >
                    <span className="material-symbols-outlined filled">{isPlaying ? 'pause' : 'play_arrow'}</span>
                </GlassButton>
            </div>
        </div>
    );
};

const Layout = ({ children, audioState, audioControls, currentTrack, onExpandPlayer }) => {
    const { isPlaying } = audioState;
    const { play, pause } = audioControls;

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-bg relative">
            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative z-0">
                {children}
            </div>

            {/* Persistent Mini Player */}
            {currentTrack && (
                <MiniPlayer
                    track={currentTrack}
                    isPlaying={isPlaying}
                    onPlayPause={() => isPlaying ? pause() : play()}
                    onExpand={onExpandPlayer}
                />
            )}
        </div>
    );
};

export default Layout;
