import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Rewind, FastForward, Settings, FolderOpen, Music, Shuffle, Repeat, Repeat1, Sliders, Activity, Box, Trash2, Plus } from 'lucide-react';
import { useAudioEngine } from './hooks/useAudioEngine';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function App() {
  const [tracks, setTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [showEqModal, setShowEqModal] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [trackInfo, setTrackInfo] = useState({ title: 'CYBERPLAYER', artist: 'NO TRACK LOADED', bitrate: '---' });

  // Seek State (local to avoid jitter while dragging)
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const {
    isPlaying, duration, currentTime, play, pause, stop, seekRelative, seekTo,
    handleNext, handlePrev, setPreset, toggle3D, currentPreset,
    is3DEnabled, isShuffle, toggleShuffle, repeatMode, toggleRepeat
  } = useAudioEngine(tracks, currentTrackIndex, setCurrentTrackIndex);

  // Sync seek bar with time
  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentTime);
    }
  }, [currentTime, isSeeking]);

  const handleSeekStart = () => setIsSeeking(true);
  const handleSeekChange = (e) => setSeekValue(parseFloat(e.target.value));
  const handleSeekEnd = (e) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
    setIsSeeking(false);
  };

  const handleFileSelect = async (files) => {
    const fileArray = Array.from(files);
    const audioFiles = fileArray.filter(file => file.type.startsWith('audio/'));
    audioFiles.sort((a, b) => a.name.localeCompare(b.name));
    setTracks(prev => [...prev, ...audioFiles]);
    if (currentTrackIndex === -1 && audioFiles.length > 0) setCurrentTrackIndex(0);
  };

  const handleTouchStart = (index) => {
    const timer = setTimeout(() => {
      setIsSelectionMode(true);
      toggleSelection(index);
    }, 600);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

  const toggleSelection = (index) => {
    setSelectedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      if (newSet.size === 0) setIsSelectionMode(false);
      return newSet;
    });
  };

  const deleteSelected = () => {
    setTracks(prev => prev.filter((_, i) => !selectedTracks.has(i)));
    setSelectedTracks(new Set());
    setIsSelectionMode(false);
    if (selectedTracks.has(currentTrackIndex)) {
      stop();
      setCurrentTrackIndex(-1);
    }
  };

  useEffect(() => {
    if (currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
      const file = tracks[currentTrackIndex];
      setTrackInfo({
        title: file.name.replace(/\.[^/.]+$/, ""),
        artist: 'UNKNOWN ARTIST',
        bitrate: '320 KBPS',
      });
    }
  }, [currentTrackIndex, tracks]);

  return (
    <div className="app-container">

      {/* Header Info */}
      <header className="header cyber-panel">
        <h1 className="track-title">{trackInfo.title}</h1>
        <div className="track-meta">
          <span>{trackInfo.artist}</span>
          <span style={{ color: 'var(--neon-pink)' }}>{formatTime(seekValue)} / {formatTime(duration)}</span>
        </div>
        <div className="track-meta" style={{ fontSize: '0.7rem', opacity: 0.6 }}>
          <span>{trackInfo.bitrate}</span>
          <span>STEREO</span>
        </div>
      </header>

      {/* Playlist */}
      <div className="playlist-container cyber-panel">
        {tracks.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            <FolderOpen size={64} color="var(--neon-cyan)" />
            <p style={{ marginTop: '20px', letterSpacing: '2px' }}>NO FILES LOADED</p>
          </div>
        ) : (
          <ul className="track-list">
            {tracks.map((track, index) => (
              <li
                key={index}
                onClick={() => isSelectionMode ? toggleSelection(index) : setCurrentTrackIndex(index)}
                onMouseDown={() => handleTouchStart(index)}
                onMouseUp={handleTouchEnd}
                onTouchStart={() => handleTouchStart(index)}
                onTouchEnd={handleTouchEnd}
                className={`track-item ${currentTrackIndex === index ? 'active' : ''} ${selectedTracks.has(index) ? 'selected' : ''}`}
              >
                <Music size={18} color={currentTrackIndex === index ? 'var(--neon-pink)' : 'var(--neon-cyan)'} />
                <span className="track-name" style={{ color: currentTrackIndex === index ? '#fff' : 'inherit' }}>{track.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tools Panel */}
      <div className="tools-panel">
        <button onClick={() => setShowEqModal(true)} className="tool-btn">
          <Sliders size={16} /> EQ
        </button>
        <button className="tool-btn">
          <Activity size={16} /> COMP
        </button>
        <button onClick={toggle3D} className={`tool-btn ${is3DEnabled ? 'active' : ''}`}>
          <Box size={16} /> 3D
        </button>
        <label className="tool-btn">
          <Plus size={16} /> ADD
          <input type="file" multiple onChange={(e) => handleFileSelect(e.target.files)} hidden />
        </label>
        {isSelectionMode && (
          <button onClick={deleteSelected} className="tool-btn danger">
            <Trash2 size={16} /> DEL
          </button>
        )}
      </div>

      {/* Controls */}
      <footer className="footer" style={{ flexDirection: 'column', gap: '10px' }}>
        {/* Progress Bar */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#888' }}>{formatTime(seekValue)}</span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={seekValue}
            onChange={handleSeekChange}
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            style={{
              flex: 1,
              accentColor: 'var(--neon-pink)',
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          />
          <span style={{ fontSize: '0.7rem', color: '#888' }}>{formatTime(duration)}</span>
        </div>

        <div className="controls-row">
          <button onClick={toggleShuffle} className={`icon-btn ${isShuffle ? 'active' : ''}`}>
            <Shuffle size={20} />
          </button>

          <button onClick={handlePrev} className="icon-btn"><SkipBack size={24} /></button>

          {isPlaying ? (
            <button onClick={pause} className="play-btn"><Pause size={32} fill="black" /></button>
          ) : (
            <button onClick={play} className="play-btn"><Play size={32} fill="black" style={{ marginLeft: '4px' }} /></button>
          )}

          <button onClick={handleNext} className="icon-btn"><SkipForward size={24} /></button>

          <button onClick={toggleRepeat} className={`icon-btn ${repeatMode !== 'OFF' ? 'active' : ''}`}>
            {repeatMode === 'ONE' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>
        </div>
      </footer>

      {/* EQ Modal */}
      {showEqModal && (
        <div className="modal-overlay" onClick={() => setShowEqModal(false)}>
          <div className="config-panel" onClick={e => e.stopPropagation()}>
            <div className="config-header">
              <h2 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)' }}>EQUALIZER</h2>
              <button onClick={() => setShowEqModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>X</button>
            </div>
            <div className="preset-grid">
              {['FLAT', 'CYBER_BASS', 'NEON_TREBLE', 'UNDERGROUND', 'PUNCHY'].map(preset => (
                <button
                  key={preset}
                  onClick={() => setPreset(preset)}
                  className={`preset-btn ${currentPreset === preset ? 'active' : ''}`}
                >
                  <span>{preset.replace('_', ' ')}</span>
                  {currentPreset === preset && <div style={{ width: 8, height: 8, background: 'black', borderRadius: '50%' }}></div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
