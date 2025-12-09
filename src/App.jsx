import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAudioEngine } from './hooks/useAudioEngine';
import Visualizer from './components/Visualizer';
import { parseAudioFile } from './utils/audioMetadata';
import { saveTrack, getAllTracks, deleteTrack } from './utils/db';

// --- Reusable Components (From code.html) ---

const NeumorphicButton = ({ children, className = '', isInset = false, ...props }) => {
  const baseClasses = "flex items-center justify-center rounded-full transition-all duration-300 ease-in-out border border-white/10 dark:border-black/20";
  // Explicit background color handling to match parent surface or special design
  const bgClasses = "bg-surface-light bg-surface-dark text-on-surface-light text-on-surface-dark";

  const shadowClasses = isInset
    ? 'shadow-neumorphic-inset-light shadow-neumorphic-inset-dark'
    : 'shadow-neumorphic-light shadow-neumorphic-dark active:shadow-neumorphic-inset-light active:shadow-neumorphic-inset-dark hover:scale-[1.05] active:scale-[0.95]';

  return (
    <button className={`${baseClasses} ${bgClasses} ${shadowClasses} ${className}`} {...props}>
      {children}
    </button>
  );
};

const PremiumSwitch = ({ value, onToggle }) => {
  // Enforce 'md' size mostly, 'sm' is now just slightly smaller but still visible
  // const isSmall = size === 'xxs'; // disabled 'sm' mapping effectively to make everything larger
  const width = 'w-14';
  const height = 'h-8';
  const knobSize = 'w-6 h-6';
  const translate = 'translate-x-7'; // 14 (w) - 6 (knob) - 1 (padding) approx

  const handleClick = (e) => {
    e.stopPropagation();
    if (onToggle) onToggle(!value);
  };

  return (
    <div
      onClick={handleClick}
      className={`${width} ${height} rounded-full cursor-pointer relative transition-all duration-300 ease-in-out flex items-center border-2 border-primary/50
        ${value ? 'bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]' : 'bg-gray-400 dark:bg-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'}`}
    >
      <div
        className={`${knobSize} rounded-full shadow-lg transform transition-transform duration-300 ease-in-out absolute left-0.5
          ${value ? `${translate} bg-white border border-gray-200` : 'translate-x-0 bg-white dark:bg-gray-300 border border-gray-400'}
        `}
      ></div>
    </div>
  );
};

const RangeSlider = ({ label, id, value, onChange, min = -12, max = 12 }) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="text-sm font-medium text-on-surface-variant-light text-on-surface-variant-dark" htmlFor={id}>{label}</label>
    <div className="relative flex items-center w-full">
      <span className="text-xs text-on-surface-variant-light text-on-surface-variant-dark mr-2">{min}</span>
      <input
        className="flex-grow mx-2"
        id={id}
        max={max}
        min={min}
        type="range"
        value={value}
        onChange={onChange}
      />
      <span className="text-xs text-on-surface-variant-light text-on-surface-variant-dark ml-2">{max}</span>
    </div>
  </div>
);

// --- Settings Menu Component ---
const SettingsMenu = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose}></div>
      <div className="absolute top-16 right-4 z-50 w-auto min-w-[150px] rounded-2xl bg-surface-light bg-surface-dark shadow-neumorphic-light shadow-neumorphic-dark p-4 flex flex-col gap-2">
        {/* Empty for now as requested by user */}
      </div>
    </>
  );
};

// --- Layout Components ---

const PlayerHeader = ({ title, onMenuClick }) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center px-6 py-4 justify-between shrink-0 bg-transparent" style={{ height: 'var(--header-height)' }}>
      <div className="flex w-12 items-center justify-start">
        <NeumorphicButton className="h-10 w-10 text-on-surface-light text-on-surface-dark" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">expand_more</span>
        </NeumorphicButton>
      </div>
      <h2 className="text-on-surface-variant-light text-on-surface-variant-dark text-xs font-bold tracking-widest flex-1 text-center uppercase truncate px-2">{title || "REPRODUCIENDO"}</h2>
      <div className="flex w-12 items-center justify-end relative">
        <NeumorphicButton className="h-10 w-10 text-on-surface-light text-on-surface-dark" onClick={onMenuClick}>
          <span className="material-symbols-outlined">more_vert</span>
        </NeumorphicButton>
      </div>
    </div>
  );
}

const SongInfo = ({ title, artist }) => (
  <div className="flex-shrink-0 px-8 pt-2 pb-4">
    <div className="flex justify-between items-center">
      <div className="flex-1 min-w-0 pr-4">
        <h1 className="text-primary tracking-tight text-2xl font-bold leading-tight truncate">{title}</h1>
        <p className="text-on-surface-variant-light text-on-surface-variant-dark text-base font-normal leading-normal truncate pt-1">{artist}</p>
      </div>
      <NeumorphicButton className="h-12 w-12 flex-shrink-0 text-on-surface-variant-light text-on-surface-variant-dark hover:text-red-500">
        <span className="material-symbols-outlined">favorite_border</span>
      </NeumorphicButton>
    </div>
  </div>
);

const ProgressBar = ({ currentTime, duration, onSeek, onSeekStart, onSeekEnd }) => {
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex flex-col gap-2 px-8 pt-2 pb-2">
      {/* Invisible range input overlay for easier interaction */}
      <div className="relative h-4 w-full flex items-center">
        <div className="absolute inset-0 rounded-full bg-transparent p-1 shadow-neumorphic-inset-light shadow-neumorphic-inset-dark pointer-events-none">
          <div className="h-full rounded-full bg-primary transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
        </div>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={onSeek}
          onMouseDown={onSeekStart}
          onTouchStart={onSeekStart}
          onMouseUp={onSeekEnd}
          onTouchEnd={onSeekEnd}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>
      <div className="flex justify-between">
        <p className="text-on-surface-variant-light text-on-surface-variant-dark text-xs font-normal">{formatTime(currentTime)}</p>
        <p className="text-on-surface-variant-light text-on-surface-variant-dark text-xs font-normal">{formatTime(duration)}</p>
      </div>
    </div>
  );
};

const PlayerControls = ({ isPlaying, onPlayPause, onNext, onPrev }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-4">
    <NeumorphicButton className="h-14 w-14 text-on-surface-light text-on-surface-dark" onClick={onPrev}>
      <span className="material-symbols-outlined text-3xl">skip_previous</span>
    </NeumorphicButton>
    <button
      onClick={onPlayPause}
      className="flex items-center justify-center rounded-full h-18 w-18 bg-primary text-black shadow-primary/40 active:scale-95 transition-transform"
      style={{ width: '4.5rem', height: '4.5rem' }}
    >
      <span className="material-symbols-outlined text-4xl filled">{isPlaying ? 'pause' : 'play_arrow'}</span>
    </button>
    <NeumorphicButton className="h-14 w-14 text-on-surface-light text-on-surface-dark" onClick={onNext}>
      <span className="material-symbols-outlined text-3xl">skip_next</span>
    </NeumorphicButton>
  </div>
);

const PlayerBottomNav = () => (
  <div className="flex items-center justify-around px-6 py-2 pb-6 mt-auto">
    <Link to="/" className="flex flex-col items-center gap-1 text-primary">
      <span className="material-symbols-outlined filled">home</span>
      <span className="text-xs font-medium">Inicio</span>
    </Link>
    <Link to="/search" className="flex flex-col items-center gap-1 text-on-surface-variant-light text-on-surface-variant-dark">
      <span className="material-symbols-outlined">search</span>
      <span className="text-xs">Buscar</span>
    </Link>
    <Link to="/library" className="flex flex-col items-center gap-1 text-on-surface-variant-light text-on-surface-variant-dark">
      <span className="material-symbols-outlined">library_music</span>
      <span className="text-xs">Biblioteca</span>
    </Link>
  </div>
);

// --- View Components ---

const CoverView = ({ art }) => (
  <div
    className="w-full h-full bg-center bg-no-repeat bg-cover rounded-xl flex items-center justify-center transition-all duration-300"
    style={{ backgroundImage: art ? `url("${art}")` : 'none', backgroundColor: art ? 'transparent' : 'var(--surface)' }}
  >
    {!art && <span className="material-symbols-outlined text-6xl text-on-surface-variant-light text-on-surface-variant-dark opacity-20">music_note</span>}
  </div>
);

const EqualizerView = ({
  eqBands, setEqBand
}) => {
  // Unused controls removed for cleaner UI as requested
  // isEqEnabled is assumed true or managed internally if needed
  const isEqEnabled = true;

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-y-auto custom-scrollbar transition-colors duration-300">

      {/* EQ Header - Minimalist */}
      <h3 className="font-bold text-lg text-on-surface-light text-on-surface-dark mb-4 text-center uppercase tracking-widest">Ecualizador</h3>

      <div className={`flex-grow space-y-4 flex flex-col justify-center py-2 shrink-0 transition-opacity duration-300 ${isEqEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
        <RangeSlider
          label="Graves" id="low" value={eqBands?.low || 0}
          onChange={(e) => setEqBand && setEqBand('low', parseFloat(e.target.value))}
        />
        <RangeSlider
          label="Medios" id="mid" value={eqBands?.mid || 0}
          onChange={(e) => setEqBand && setEqBand('mid', parseFloat(e.target.value))}
        />
        <RangeSlider
          label="Agudos" id="high" value={eqBands?.high || 0}
          onChange={(e) => setEqBand && setEqBand('high', parseFloat(e.target.value))}
        />
      </div>

    </div>
  );
};

const ListView = ({ tracks, currentTrackIndex, onSelect, onDelete, onAddSong }) => (
  <div className="w-full h-full bg-surface-light bg-surface-dark rounded-xl flex flex-col p-4 overflow-hidden transition-colors duration-300">
    <div className="flex justify-between items-center mb-3 px-1">
      <h3 className="text-lg font-bold text-on-surface-light text-on-surface-dark">Cola</h3>
      <span className="text-xs text-on-surface-variant-light text-on-surface-variant-dark">{tracks.length} canciones</span>
    </div>
    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full opacity-50">
          <p className="text-sm">No hay canciones</p>
        </div>
      ) : (
        tracks.map((track, index) => (
          <div
            key={track.id || index}
            onClick={() => onSelect(index)}
            className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${index === currentTrackIndex ? 'bg-primary/10 border border-primary/20' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <div
              className="w-10 h-10 rounded bg-cover bg-center mr-3 flex-shrink-0 bg-surface-light dark:bg-surface-dark shadow-sm"
              style={{ backgroundImage: track.picture ? `url("${track.picture}")` : 'none' }}
            >
              {!track.picture && <span className="flex items-center justify-center w-full h-full material-symbols-outlined text-sm opacity-50">music_note</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm truncate ${index === currentTrackIndex ? 'text-primary' : 'text-on-surface-light text-on-surface-dark'}`}>{track.name}</p>
              <p className="text-xs text-on-surface-variant-light text-on-surface-variant-dark truncate">{track.artist}</p>
            </div>
            <button
              className="text-on-surface-variant-light text-on-surface-variant-dark hover:text-red-500 ml-2 p-2"
              onClick={(e) => { e.stopPropagation(); onDelete(track.id, index); }}
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
          </div>
        ))
      )}
    </div>
    <label className="mt-3 flex items-center justify-center w-full py-3 px-4 rounded-full bg-primary text-black text-sm font-bold shadow-primary/30 active:scale-95 transition-transform cursor-pointer">
      <span className="material-symbols-outlined text-xl mr-1">add</span>
      Agregar Canción
      <input type="file" multiple accept="audio/*" onChange={(e) => onAddSong(e.target.files)} hidden />
    </label>
  </div>
);

// --- Screens ---

const PlayerScreen = ({
  initialTab = 'cover',
  audioState,
  audioControls,
  tracks,
  currentTrackIndex,
  setCurrentTrackIndex,
  setTracks,
  onDeleteTrack
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [seekValue, setSeekValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync activeTab with navigation if needed, but keeping internal state is smoother for animations
  // We could use URL params but local state is fine for this "Tab" view inside the PlayerScreen

  const { isPlaying, duration, currentTime, analyser, isEqEnabled, toggleEq, is3DEnabled, toggle3D, eqBands, setEqBand, isCompressorEnabled, toggleCompressor, isCrossfadeEnabled, toggleCrossfade, crossfadeDuration, setCrossfadeDuration } = audioState;
  const { play, pause, seekTo } = audioControls;

  const currentTrack = tracks[currentTrackIndex];

  const handleSeekStart = () => { setIsSeeking(true); setSeekValue(currentTime); };
  const handleSeekChange = (e) => setSeekValue(parseFloat(e.target.value));
  const handleSeekEnd = (e) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
    setIsSeeking(false);
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
      case 'equalizer': return <EqualizerView eqBands={eqBands} setEqBand={setEqBand} isEqEnabled={isEqEnabled} toggleEq={toggleEq} is3DEnabled={is3DEnabled} toggle3D={toggle3D} isCompressorEnabled={isCompressorEnabled} toggleCompressor={toggleCompressor} isCrossfadeEnabled={isCrossfadeEnabled} toggleCrossfade={toggleCrossfade} crossfadeDuration={crossfadeDuration} setCrossfadeDuration={setCrossfadeDuration} />;
      case 'wave': return <Visualizer analyser={analyser} isInteractive={true} />;
      case 'list': return <ListView tracks={tracks} currentTrackIndex={currentTrackIndex} onSelect={setCurrentTrackIndex} onDelete={onDeleteTrack} onAddSong={handleFileSelect} />;
      case 'cover':
      default: return <CoverView art={currentTrack?.picture} />;
    }
  }

  return (
    <div className="flex flex-col h-full w-full relative">
      <PlayerHeader title={currentTrack?.name} onMenuClick={() => setIsSettingsOpen(prev => !prev)} />

      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <div className="flex w-full grow flex-col px-2 pt-6 pb-4 overflow-hidden">
        <div className="flex flex-col flex-1 h-full">
          {/* Main Visual Area */}
          <div className="w-full flex-1 overflow-hidden rounded-xl bg-surface-light bg-surface-dark shadow-neumorphic-light shadow-neumorphic-dark relative flex items-center justify-center p-1">
            {renderTab()}
          </div>

          {/* Tab Switchers */}
          <div className="flex justify-center gap-4 py-4 shrink-0">
            <NeumorphicButton isInset={activeTab === 'equalizer'} onClick={() => setActiveTab('equalizer')} className={`h-12 w-12 ${activeTab === 'equalizer' ? 'text-primary' : 'text-on-surface-variant-light text-on-surface-variant-dark'}`}>
              <span className="material-symbols-outlined filled">equalizer</span>
            </NeumorphicButton>
            <NeumorphicButton isInset={activeTab === 'wave'} onClick={() => setActiveTab('wave')} className={`h-12 w-12 ${activeTab === 'wave' ? 'text-primary' : 'text-on-surface-variant-light text-on-surface-variant-dark'}`}>
              <span className="material-symbols-outlined filled">waves</span>
            </NeumorphicButton>
            <NeumorphicButton isInset={activeTab === 'list'} onClick={() => setActiveTab('list')} className={`h-12 w-12 ${activeTab === 'list' ? 'text-primary' : 'text-on-surface-variant-light text-on-surface-variant-dark'}`}>
              <span className="material-symbols-outlined filled">list</span>
            </NeumorphicButton>
            <NeumorphicButton isInset={activeTab === 'cover'} onClick={() => setActiveTab('cover')} className={`h-12 w-12 ${activeTab === 'cover' ? 'text-primary' : 'text-on-surface-variant-light text-on-surface-variant-dark'}`}>
              <span className="material-symbols-outlined filled">album</span>
            </NeumorphicButton>
          </div>
        </div>
      </div>

      <SongInfo title={currentTrack?.name || "No Track"} artist={currentTrack?.artist || "Desconocido"} />

      <ProgressBar
        currentTime={isSeeking ? seekValue : currentTime}
        duration={duration}
        onSeek={handleSeekChange}
        onSeekStart={handleSeekStart}
        onSeekEnd={handleSeekEnd}
      />

      <PlayerControls
        isPlaying={isPlaying}
        onPlayPause={() => isPlaying ? pause() : play()}
        onNext={audioControls.handleNext}
        onPrev={audioControls.handlePrev}
      />

      <PlayerBottomNav />
    </div>
  );
};

const SearchPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full w-full">
      <div className="sticky top-0 z-10 flex flex-col gap-2 p-4 pb-3 backdrop-blur-lg border-b border-black/5 dark:border-white/5">
        <div className="flex h-12 items-center justify-between">
          <NeumorphicButton onClick={() => navigate(-1)} className="h-12 w-12 text-on-surface-variant-light dark:text-on-surface-variant-dark">
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </NeumorphicButton>
        </div>
        <h1 className="px-2 text-3xl font-bold leading-tight tracking-tight">Búsqueda</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-50 text-center">
        <span className="material-symbols-outlined text-6xl mb-4">construction</span>
        <p>Funcionalidad de búsqueda en desarrollo</p>
        <div className="mt-8 p-4 bg-primary/10 rounded-xl w-full">
          <p className="text-sm font-semibold">Protip: Usa la pestaña "Lista" en el reproductor para agregar archivos locales.</p>
        </div>
      </div>
      <PlayerBottomNav />
    </div>
  )
}

const LibraryPage = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center p-4 justify-between shrink-0">
        <div className="flex w-12 items-center justify-start">
          <NeumorphicButton onClick={() => navigate(-1)} className="h-12 w-12 text-on-surface-light dark:text-on-surface-dark">
            <span className="material-symbols-outlined">chevron_left</span>
          </NeumorphicButton>
        </div>
        <h1 className="text-xl font-bold">Mi Biblioteca</h1>
        <div className="flex w-12 items-center justify-end"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-50 text-center">
        <span className="material-symbols-outlined text-6xl mb-4">library_music</span>
        <p>Biblioteca en desarrollo</p>
      </div>

      <PlayerBottomNav />
    </div>
  )
}

function App() {
  const [tracks, setTracks] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isDark, setIsDark] = useState(true);

  // Initialize Audio Engine
  const audioEngine = useAudioEngine(tracks, currentTrackIndex, setCurrentTrackIndex);

  // Global Theme Init
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = (val) => setIsDark(val);

  // Load Tracks
  useEffect(() => {
    const loadTracks = async () => {
      const loadedTracks = await getAllTracks();
      if (loadedTracks.length > 0) {
        setTracks(loadedTracks);
      }
    };
    loadTracks();
  }, []);

  const handleDeleteTrack = async (id, index) => {
    if (id) await deleteTrack(id);
    setTracks(prev => prev.filter((_, i) => i !== index));
    if (currentTrackIndex === index) audioEngine.audioControls.stop();
  };

  return (
    <div className="app-container" style={{ width: '100%', height: '100%' }}>
      <Routes>
        <Route path="/" element={
          <PlayerScreen
            audioState={audioEngine}
            audioControls={audioEngine.audioControls}
            tracks={tracks}
            currentTrackIndex={currentTrackIndex}
            setCurrentTrackIndex={setCurrentTrackIndex}
            setTracks={setTracks}
            onDeleteTrack={handleDeleteTrack}
            isDark={isDark}
            toggleTheme={toggleTheme}
          />
        } />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/library" element={<LibraryPage />} />
        {/* Replicate routes for specific tabs if deep linking was needed, but internal state is easier for now */}
      </Routes>
    </div>
  );
}

export default App;
