import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAudioEngine } from './hooks/useAudioEngine';
import Visualizer from './components/Visualizer'; // Keeping existing visualizer
import { parseAudioFile } from './utils/audioMetadata';
import { saveTrack, getAllTracks, deleteTrack } from './utils/db';

// New Components
import GlassButton from './components/GlassButton';
import ToggleSwitch from './components/ToggleSwitch';
import Slider from './components/Slider';
import Layout from './components/Layout';

// --- Local Components for Views ---

// Settings Menu (simplified for now)
const SettingsMenu = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose}></div>
      <div className="absolute top-16 right-4 z-50 w-auto min-w-[150px] rounded-2xl glass-panel p-4 flex flex-col gap-2 bg-black/80 backdrop-blur-xl border border-white/10">
        <p className="text-xs text-center text-white/50">Configuración</p>
      </div>
    </>
  );
};

const PlayerHeader = ({ title, onMenuClick, onMinimize }) => {
  return (
    <div className="flex items-center px-6 py-4 justify-between shrink-0 h-[var(--header-height)]">
      <div className="flex w-12 items-center justify-start">
        <GlassButton className="h-10 w-10 text-white" onClick={onMinimize}>
          <span className="material-symbols-outlined">expand_more</span>
        </GlassButton>
      </div>
      <h2 className="text-white/70 text-xs font-bold tracking-widest flex-1 text-center uppercase truncate px-2">{title || "REPRODUCIENDO"}</h2>
      <div className="flex w-12 items-center justify-end relative">
        <GlassButton className="h-10 w-10 text-white" onClick={onMenuClick}>
          <span className="material-symbols-outlined">more_vert</span>
        </GlassButton>
      </div>
    </div>
  );
};

const SongInfo = ({ title, artist }) => (
  <div className="flex-shrink-0 px-8 pt-2 pb-4">
    <div className="flex justify-between items-center">
      <div className="flex-1 min-w-0 pr-4">
        <h1 className="text-primary tracking-tight text-2xl font-bold leading-tight truncate drop-shadow-[0_0_10px_rgba(19,236,91,0.3)]">{title}</h1>
        <p className="text-white/60 text-base font-normal leading-normal truncate pt-1">{artist}</p>
      </div>
      <GlassButton className="h-12 w-12 flex-shrink-0 text-white/60 hover:text-red-500">
        <span className="material-symbols-outlined">favorite_border</span>
      </GlassButton>
    </div>
  </div>
);

const PlayerControls = ({ isPlaying, onPlayPause, onNext, onPrev }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-4">
    <GlassButton className="h-14 w-14 text-white" onClick={onPrev}>
      <span className="material-symbols-outlined text-3xl">skip_previous</span>
    </GlassButton>
    <button
      onClick={onPlayPause}
      className="flex items-center justify-center rounded-full h-20 w-20 bg-primary text-black shadow-[0_0_20px_rgba(19,236,91,0.4)] active:scale-95 transition-transform hover:scale-105"
    >
      <span className="material-symbols-outlined text-5xl filled">{isPlaying ? 'pause' : 'play_arrow'}</span>
    </button>
    <GlassButton className="h-14 w-14 text-white" onClick={onNext}>
      <span className="material-symbols-outlined text-3xl">skip_next</span>
    </GlassButton>
  </div>
);

const ProgressBar = ({ currentTime, duration, onSeek }) => {
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-2 px-8 pt-2 pb-2">
      <Slider
        value={currentTime}
        max={duration || 0}
        onChange={onSeek}
      // Note: Adding support for mouse events in Slider would be ideal, but native range input handles it mostly.
      // For 'onSeekStart/End', we might need to enhance Slider or just rely on native behavior which is generally 'change' on drag?
      // Standard range input 'steps' work fine.
      />
      <div className="flex justify-between">
        <p className="text-white/50 text-xs font-normal">{formatTime(currentTime)}</p>
        <p className="text-white/50 text-xs font-normal">{formatTime(duration)}</p>
      </div>
    </div>
  );
};

// --- Views used inside Player Modal ---

const CoverView = ({ art }) => (
  <div
    className="w-full h-full bg-center bg-no-repeat bg-cover rounded-xl flex items-center justify-center transition-all duration-300 shadow-2xl border border-white/5"
    style={{ backgroundImage: art ? `url("${art}")` : 'none', backgroundColor: art ? 'transparent' : 'rgba(255,255,255,0.03)' }}
  >
    {!art && <span className="material-symbols-outlined text-8xl text-white/10">music_note</span>}
  </div>
);

const EqualizerView = ({
  eqBands, setEqBand,
  isCompressorEnabled, toggleCompressor,
  is3DEnabled, toggle3D,
  isCrossfadeEnabled, toggleCrossfade,
  crossfadeDuration, setCrossfadeDuration
}) => {
  return (
    <div className="w-full h-full flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <h3 className="font-bold text-lg text-white mb-6 text-center uppercase tracking-widest border-b border-white/10 pb-2">Audio FX</h3>

      {/* EQ Sliders */}
      <div className="flex flex-col gap-6 mb-8">
        {['low', 'mid', 'high'].map(band => (
          <div key={band} className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-white/70 uppercase font-semibold">
              <span>{band === 'low' ? 'Graves' : band === 'mid' ? 'Medios' : 'Agudos'}</span>
              <span>{eqBands[band]}dB</span>
            </div>
            <Slider
              min={-12} max={12}
              value={eqBands[band]}
              onChange={(e) => setEqBand(band, parseFloat(e.target.value))}
            />
          </div>
        ))}
      </div>

      {/* FX Toggles */}
      <div className="flex flex-col gap-4 p-4 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium">Compresor</span>
          <ToggleSwitch value={isCompressorEnabled} onToggle={toggleCompressor} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium">Sonido 3D</span>
          <ToggleSwitch value={is3DEnabled} onToggle={toggle3D} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium">Crossfade</span>
          <ToggleSwitch value={isCrossfadeEnabled} onToggle={toggleCrossfade} />
        </div>

        {/* Crossfade Duration - Conditional */}
        {isCrossfadeEnabled && (
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5 animate-pulse-once">
            <div className="flex justify-between text-xs text-white/50">
              <span>Duración</span>
              <span>{crossfadeDuration}s</span>
            </div>
            <Slider
              min={1} max={12}
              value={crossfadeDuration}
              onChange={(e) => setCrossfadeDuration(parseFloat(e.target.value))}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ListView = ({ tracks, currentTrackIndex, onSelect, onDelete, onAddSong }) => (
  <div className="w-full h-full bg-black/20 backdrop-blur-md rounded-xl flex flex-col p-4 overflow-hidden border border-white/5">
    <div className="flex justify-between items-center mb-3 px-1">
      <h3 className="text-lg font-bold text-white">Cola</h3>
      <span className="text-xs text-white/50">{tracks.length} canciones</span>
    </div>
    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
      {tracks.map((track, index) => (
        <div
          key={track.id || index}
          onClick={() => onSelect(index)}
          className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors border border-transparent ${index === currentTrackIndex ? 'bg-primary/20 border-primary/30' : 'hover:bg-white/5'}`}
        >
          <div
            className="w-10 h-10 rounded bg-cover bg-center mr-3 flex-shrink-0 bg-white/5 border border-white/10"
            style={{ backgroundImage: track.picture ? `url("${track.picture}")` : 'none' }}
          >
            {!track.picture && <span className="flex items-center justify-center w-full h-full material-symbols-outlined text-xs text-white/30">music_note</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm truncate ${index === currentTrackIndex ? 'text-primary' : 'text-white'}`}>{track.name}</p>
            <p className="text-xs text-white/50 truncate">{track.artist}</p>
          </div>
          <button
            className="text-white/40 hover:text-red-500 ml-2 p-2"
            onClick={(e) => { e.stopPropagation(); onDelete(track.id, index); }}
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>
      ))}
    </div>
    <label className="mt-3 flex items-center justify-center w-full py-3 px-4 rounded-full bg-primary text-black text-sm font-bold shadow-[0_0_15px_rgba(19,236,91,0.3)] active:scale-95 transition-transform cursor-pointer hover:bg-white hover:text-primary">
      <span className="material-symbols-outlined text-xl mr-1">add</span>
      Agregar Audio
      <input type="file" multiple accept="audio/*" onChange={(e) => onAddSong(e.target.files)} hidden />
    </label>
  </div>
);

// --- The Player Modal ---

const PlayerModal = ({ isOpen, onClose, audioState, audioControls, tracks, currentTrackIndex, setCurrentTrackIndex, setTracks, onDeleteTrack }) => {
  const currentTrack = tracks[currentTrackIndex];
  // Default to list if no track, else cover
  const [activeTab, setActiveTab] = useState(currentTrack ? 'cover' : 'list');
  // Update activeTab when currentTrack changes ONLY if we are in a 'state' that implies we should switch? 
  // actually simpler to just let user switch. But initial state is good.

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isPlaying, duration, currentTime, analyser, is3DEnabled, toggle3D, eqBands, setEqBand, isCompressorEnabled, toggleCompressor, isCrossfadeEnabled, toggleCrossfade, crossfadeDuration, setCrossfadeDuration } = audioState;
  const { play, pause, seekTo } = audioControls;

  const handleSeekChange = (e) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
  };

  const handleFileSelect = async (files) => {
    const fileArray = Array.from(files);
    const audioFiles = fileArray.filter(file => file.type.startsWith('audio/'));
    const processedTracks = await Promise.all(audioFiles.map(file => parseAudioFile(file)));
    const savedTracks = [];
    for (const track of processedTracks) {
      const id = await saveTrack(track);
      savedTracks.push({ ...track, id });
    }
    setTracks(prev => {
      const newTracks = [...prev, ...savedTracks];
      newTracks.sort((a, b) => a.name.localeCompare(b.name));
      return newTracks;
    });
    if (currentTrackIndex === -1 && savedTracks.length > 0) setCurrentTrackIndex(0);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'equalizer': return <EqualizerView
        eqBands={eqBands} setEqBand={setEqBand}
        isCompressorEnabled={isCompressorEnabled} toggleCompressor={toggleCompressor}
        is3DEnabled={is3DEnabled} toggle3D={toggle3D}
        isCrossfadeEnabled={isCrossfadeEnabled} toggleCrossfade={toggleCrossfade}
        crossfadeDuration={crossfadeDuration} setCrossfadeDuration={setCrossfadeDuration}
      />;
      case 'wave': return <Visualizer analyser={analyser} isInteractive={true} />;
      case 'list': return <ListView tracks={tracks} currentTrackIndex={currentTrackIndex} onSelect={setCurrentTrackIndex} onDelete={onDeleteTrack} onAddSong={handleFileSelect} />;
      case 'cover':
      default: return <CoverView art={currentTrack?.picture} />;
    }
  };

  // If not open, we can hide it via CSS translate to allow it to "slide up"
  const translateClass = isOpen ? 'translate-y-0' : 'translate-y-full';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-[#050505] transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${translateClass}`}>
      {/* Background Ambience */}
      <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none overflow-hidden">
        {currentTrack?.picture && (
          <div className="absolute inset-[-50%] bg-center bg-cover blur-3xl opacity-50 transition-all duration-1000" style={{ backgroundImage: `url("${currentTrack.picture}")` }}></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#121212]/80 to-[#050505]"></div>
      </div>

      <PlayerHeader title={currentTrack?.name} onMenuClick={() => setIsSettingsOpen(!isSettingsOpen)} onMinimize={onClose} />
      <SettingsMenu isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <div className="flex w-full grow flex-col px-4 pt-4 pb-0 overflow-hidden">
        {/* Render Active Tab */}
        <div className="flex-1 overflow-hidden relative rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md shadow-2xl">
          {renderTab()}
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center gap-6 py-6 shrink-0">
          {[
            { id: 'equalizer', icon: 'equalizer' },
            { id: 'wave', icon: 'waves' },
            { id: 'list', icon: 'list' },
            { id: 'cover', icon: 'album' }
          ].map(tab => (
            <GlassButton
              key={tab.id}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="h-12 w-12"
            >
              <span className="material-symbols-outlined filled">{tab.icon}</span>
            </GlassButton>
          ))}
        </div>
      </div>

      <SongInfo title={currentTrack?.name || "Ready Player One"} artist={currentTrack?.artist || "Cyberpunk System"} />

      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeekChange} // Instant seek for now
      />

      <PlayerControls
        isPlaying={isPlaying}
        onPlayPause={() => isPlaying ? pause() : play()}
        onNext={audioControls.handleNext}
        onPrev={audioControls.handlePrev}
      />

      {/* Bottom spacer for safe area */}
      <div className="h-6 w-full"></div>
    </div>
  );
};


// --- Pages ---

const SearchPage = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6 text-center pt-20">
      <span className="material-symbols-outlined text-6xl text-white/20 mb-4">search</span>
      <h1 className="text-2xl font-bold text-white mb-2">Search</h1>
      <p className="text-white/50">Buscar en desarrollo...</p>
      <div className="mt-8">
        <GlassButton onClick={() => navigate('/')} className="px-6 py-2 rounded-lg bg-primary/20 text-primary">Go Home</GlassButton>
      </div>
    </div>
  );
};

const LibraryPage = () => {
  const navigate = useNavigate();
  return (
    <div className="p-6 text-center pt-20">
      <span className="material-symbols-outlined text-6xl text-white/20 mb-4">library_music</span>
      <h1 className="text-2xl font-bold text-white mb-2">Library</h1>
      <p className="text-white/50">Biblioteca en desarrollo...</p>
      <div className="mt-8">
        <GlassButton onClick={() => navigate('/')} className="px-6 py-2 rounded-lg bg-primary/20 text-primary">Go Home</GlassButton>
      </div>
    </div>
  );
};

const HomePage = ({ onOpenPlayer }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-white/50">
      <span className="material-symbols-outlined text-6xl mb-4 animate-pulse">headphones</span>
      <p className="max-w-xs mb-6">Selecciona música desde la lista (Player) o usa la Biblioteca.</p>
      <GlassButton onClick={onOpenPlayer} className="px-8 py-3 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
        Abrir Reproductor
      </GlassButton>
      <p className="mt-8 text-xs opacity-30">CyberPlayer v2.0</p>
    </div>
  )
}

// --- Main App ---

function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false); // Controls Modal

  // Audio Engine
  const audioEngine = useAudioEngine(tracks, currentTrackIndex, setCurrentTrackIndex);

  // Load Tracks
  useEffect(() => {
    const loadTracks = async () => {
      const loadedTracks = await getAllTracks();
      if (loadedTracks.length > 0) {
        setTracks(loadedTracks);
        // Don't auto-set current track index unless you want auto-play logic, 
        // but setting it to 0 helps show something.
        if (currentTrackIndex === -1) setCurrentTrackIndex(0);
      }
    };
    loadTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once

  const handleDeleteTrack = async (id, index) => {
    if (id) await deleteTrack(id);
    setTracks(prev => prev.filter((_, i) => i !== index));
    if (currentTrackIndex === index) audioEngine.audioControls.stop();
  };

  return (
    <Layout
      audioState={audioEngine}
      audioControls={audioEngine.audioControls}
      currentTrack={tracks[currentTrackIndex]}
      onExpandPlayer={() => setIsPlayerOpen(true)}
    >
      <Routes>
        <Route path="/" element={<HomePage onOpenPlayer={() => setIsPlayerOpen(true)} />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
      </Routes>

      {/* Global Player Modal */}
      <PlayerModal
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        audioState={audioEngine}
        audioControls={audioEngine.audioControls}
        tracks={tracks}
        currentTrackIndex={currentTrackIndex}
        setCurrentTrackIndex={setCurrentTrackIndex}
        setTracks={setTracks}
        onDeleteTrack={handleDeleteTrack}
      />
    </Layout>
  );
}

export default App;
