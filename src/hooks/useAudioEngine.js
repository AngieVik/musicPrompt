import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

const EQ_PRESETS = {
    FLAT: { low: 0, mid: 0, high: 0 },
    CYBER_BASS: { low: 12, mid: -4, high: 2 },
    NEON_TREBLE: { low: -6, mid: 2, high: 12 },
    UNDERGROUND: { low: 10, mid: 6, high: -8 },
    PUNCHY: { low: 6, mid: 3, high: 6 },
};

export function useAudioEngine(tracks, currentTrackIndex, setCurrentTrackIndex) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [currentPreset, setCurrentPreset] = useState('FLAT');
    const [is3DEnabled, setIs3DEnabled] = useState(false);

    // Playback Modes
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState('ALL'); // 'OFF', 'ALL', 'ONE'

    // State for Audio Element to trigger re-renders/effects correctly
    const [audioInstance, setAudioInstance] = useState(null);

    // Refs for Tone Nodes
    const sourceRef = useRef(null);
    const eqRef = useRef(null);
    const compressorRef = useRef(null);
    const widenerRef = useRef(null);
    const wakeLockRef = useRef(null);
    const silentPlayerRef = useRef(null);

    // Initialize Audio Engine & Element
    useEffect(() => {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";

        const initAudio = async () => {
            // Create Tone nodes
            eqRef.current = new Tone.EQ3(0, 0, 0);
            compressorRef.current = new Tone.Compressor({
                threshold: -24,
                ratio: 4,
                attack: 0.005,
                release: 0.2
            });
            widenerRef.current = new Tone.StereoWidener(0);

            // Silent Loop Player
            const silentBuffer = Tone.Buffer.fromArray(new Float32Array(1024));
            silentPlayerRef.current = new Tone.Player(silentBuffer);
            silentPlayerRef.current.loop = true;
            silentPlayerRef.current.toDestination();

            // Create Source
            const context = Tone.context.rawContext;
            sourceRef.current = context.createMediaElementSource(audio);

            // Connect Chain
            const toneInput = eqRef.current;
            Tone.connect(sourceRef.current, toneInput);

            eqRef.current.connect(widenerRef.current);
            widenerRef.current.connect(compressorRef.current);
            compressorRef.current.toDestination();

            console.log('Audio Engine Initialized');
            setAudioInstance(audio);
        };

        initAudio();

        // Event Listeners
        const handleEnded = () => {
            handleNext(true);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            if ('mediaSession' in navigator && !isNaN(audio.duration)) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: audio.duration,
                        playbackRate: audio.playbackRate,
                        position: audio.currentTime
                    });
                } catch (e) { /* ignore */ }
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            // Cleanup
            audio.pause();
            audio.src = "";
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);

            eqRef.current?.dispose();
            compressorRef.current?.dispose();
            widenerRef.current?.dispose();
            silentPlayerRef.current?.dispose();

            // We don't dispose sourceRef because it's tied to the audio element which is being GC'd
            setAudioInstance(null);
        };
    }, []); // Run once (but twice in Strict Mode, creating new Audio each time)

    // Navigation Logic
    const handleNext = useCallback((auto = false) => {
        setCurrentTrackIndex(prev => {
            if (tracks.length === 0) return -1;

            if (repeatMode === 'ONE' && auto && audioInstance) {
                audioInstance.currentTime = 0;
                audioInstance.play();
                return prev;
            }

            if (isShuffle) {
                return Math.floor(Math.random() * tracks.length);
            } else {
                return (prev + 1) % tracks.length;
            }
        });
    }, [tracks.length, isShuffle, repeatMode, setCurrentTrackIndex, audioInstance]);

    const handlePrev = useCallback(() => {
        setCurrentTrackIndex(prev => {
            if (tracks.length === 0) return -1;
            if (audioInstance && audioInstance.currentTime > 3) {
                audioInstance.currentTime = 0;
                return prev;
            }

            if (isShuffle) {
                return Math.floor(Math.random() * tracks.length);
            } else {
                return (prev - 1 + tracks.length) % tracks.length;
            }
        });
    }, [tracks.length, isShuffle, setCurrentTrackIndex, audioInstance]);


    // Handle Track Loading
    useEffect(() => {
        if (currentTrackIndex >= 0 && tracks[currentTrackIndex] && audioInstance) {
            const file = tracks[currentTrackIndex];
            const url = URL.createObjectURL(file);
            audioInstance.src = url;

            // Update Media Session
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: 'CyberPlayer',
                    album: 'Local Folder',
                    artwork: [] // Removed broken placeholder
                });
            }

            // Auto-play
            if (isPlaying || Tone.context.state === 'running') {
                play();
            }
        }
    }, [currentTrackIndex, tracks, audioInstance]); // Re-run when audioInstance changes!

    // Media Session Handlers
    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', play);
            navigator.mediaSession.setActionHandler('pause', pause);
            navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
            navigator.mediaSession.setActionHandler('nexttrack', () => handleNext(false));
            navigator.mediaSession.setActionHandler('seekbackward', () => seekRelative(-10));
            navigator.mediaSession.setActionHandler('seekforward', () => seekRelative(10));
        }
    }, [handleNext, handlePrev]);

    // Controls
    const play = async () => {
        if (!audioInstance) return;
        try {
            if (Tone.context.state !== 'running') {
                await Tone.start();
            }
            silentPlayerRef.current?.stop();

            await audioInstance.play();
            setIsPlaying(true);
            requestWakeLock();
        } catch (err) {
            console.error("Playback error:", err);
        }
    };

    const pause = () => {
        if (!audioInstance) return;
        audioInstance.pause();
        if (silentPlayerRef.current && Tone.context.state === 'running') {
            silentPlayerRef.current.start();
        }
        setIsPlaying(false);
        releaseWakeLock();
    };

    const stop = () => {
        if (!audioInstance) return;
        audioInstance.pause();
        audioInstance.currentTime = 0;
        silentPlayerRef.current?.stop();
        setIsPlaying(false);
        releaseWakeLock();
    };

    const seekRelative = (seconds) => {
        if (audioInstance) audioInstance.currentTime += seconds;
    };

    const seekTo = (seconds) => {
        if (audioInstance) audioInstance.currentTime = seconds;
    };

    const setPreset = (name) => {
        setCurrentPreset(name);
        const preset = EQ_PRESETS[name];
        if (eqRef.current && preset) {
            eqRef.current.low.value = preset.low;
            eqRef.current.mid.value = preset.mid;
            eqRef.current.high.value = preset.high;
        }
    };

    const toggle3D = () => {
        const newState = !is3DEnabled;
        setIs3DEnabled(newState);
        if (widenerRef.current) {
            widenerRef.current.width.value = newState ? 1 : 0;
        }
    };

    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator && !wakeLockRef.current) {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
            }
        } catch (err) { console.log(err); }
    };

    const releaseWakeLock = async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    };

    return {
        isPlaying,
        duration,
        currentTime,
        play,
        pause,
        stop,
        seekRelative,
        seekTo,
        handleNext: () => handleNext(false),
        handlePrev,
        setPreset,
        toggle3D,
        currentPreset,
        is3DEnabled,
        isShuffle,
        toggleShuffle: () => setIsShuffle(s => !s),
        repeatMode,
        toggleRepeat: () => setRepeatMode(m => m === 'OFF' ? 'ALL' : m === 'ALL' ? 'ONE' : 'OFF')
    };
}
