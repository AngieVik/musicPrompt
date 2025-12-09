import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Buffer } from 'buffer';

// Polyfill Buffer for music-metadata-browser
if (typeof window !== 'undefined' && !window.Buffer) {
    window.Buffer = Buffer;
}

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
    const [isEqEnabled, setIsEqEnabled] = useState(true);
    const [is3DEnabled, setIs3DEnabled] = useState(false);
    const [isCrossfadeEnabled, setIsCrossfadeEnabled] = useState(false);
    const [crossfadeDuration, setCrossfadeDuration] = useState(3);
    const [isCompressorEnabled, setIsCompressorEnabled] = useState(true);

    // Refs for settings to access inside closure without re-triggering effects
    const isCrossfadeEnabledRef = useRef(isCrossfadeEnabled);
    const crossfadeDurationRef = useRef(crossfadeDuration);

    useEffect(() => { isCrossfadeEnabledRef.current = isCrossfadeEnabled; }, [isCrossfadeEnabled]);
    useEffect(() => { crossfadeDurationRef.current = crossfadeDuration; }, [crossfadeDuration]);

    const [eqBands, setEqBands] = useState({ low: 0, mid: 0, high: 0 });

    // Playback Modes
    const [isShuffle, setIsShuffle] = useState(false);
    const [repeatMode, setRepeatMode] = useState('ALL'); // 'OFF', 'ALL', 'ONE'

    // State for Audio Element to trigger re-renders/effects correctly
    const [audioInstance, setAudioInstance] = useState(null);

    // Refs for Tone Nodes
    const playerARef = useRef(new Audio());
    const playerBRef = useRef(new Audio());
    const activePlayerIdRef = useRef('A'); // 'A' or 'B'

    const sourceARef = useRef(null);
    const sourceBRef = useRef(null);
    const crossFadeRef = useRef(null);

    const eqRef = useRef(null);
    const compressorRef = useRef(null);
    const widenerRef = useRef(null);
    const limiterRef = useRef(null);
    const analyserRef = useRef(null);
    const wakeLockRef = useRef(null);
    const silentPlayerRef = useRef(null);

    const requestWakeLock = useCallback(async () => {
        try {
            if ('wakeLock' in navigator && !wakeLockRef.current) {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
            }
        } catch (err) { console.log(err); }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    }, []);

    // Initialize Audio Engine & Elements
    useEffect(() => {
        const playerA = playerARef.current;
        const playerB = playerBRef.current;

        playerA.crossOrigin = "anonymous";
        playerB.crossOrigin = "anonymous";

        const initAudio = async () => {
            // Create Tone nodes only if they don't exist
            if (!crossFadeRef.current) {
                crossFadeRef.current = new Tone.CrossFade(0); // 0 = A, 1 = B
                eqRef.current = new Tone.EQ3(0, 0, 0);
                compressorRef.current = new Tone.Compressor({
                    threshold: -30,
                    ratio: 12,
                    attack: 0.003,
                    release: 0.25
                });
                widenerRef.current = new Tone.StereoWidener(0);
                limiterRef.current = new Tone.Limiter(-0.5);
                analyserRef.current = new Tone.Analyser("waveform", 256);

                // Silent Loop Player
                const silentBuffer = Tone.Buffer.fromArray(new Float32Array(1024));
                silentPlayerRef.current = new Tone.Player(silentBuffer);
                silentPlayerRef.current.loop = true;
                silentPlayerRef.current.toDestination();
            }

            // Create Sources - Check if they already exist
            const context = Tone.context.rawContext;

            if (!sourceARef.current) {
                sourceARef.current = context.createMediaElementSource(playerA);
                Tone.connect(sourceARef.current, crossFadeRef.current.a);
            }

            if (!sourceBRef.current) {
                sourceBRef.current = context.createMediaElementSource(playerB);
                Tone.connect(sourceBRef.current, crossFadeRef.current.b);
            }

            // Connect Chain
            try {
                crossFadeRef.current.disconnect();
                eqRef.current.disconnect();
                widenerRef.current.disconnect();
                compressorRef.current.disconnect();
                limiterRef.current.disconnect();
                analyserRef.current.disconnect();
            } catch { /* ignore disconnect errors */ }

            crossFadeRef.current.connect(eqRef.current);
            eqRef.current.connect(widenerRef.current);
            widenerRef.current.connect(compressorRef.current);
            compressorRef.current.connect(limiterRef.current);
            limiterRef.current.connect(analyserRef.current);
            analyserRef.current.toDestination();

            console.log('Audio Engine Initialized (Dual Deck)');
            setAudioInstance(playerA);
        };

        initAudio();

        return () => {
            // Cleanup logic
            playerA.pause();
            playerB.pause();

            // We do NOT dispose Tone nodes here to prevent re-creation issues in Strict Mode
            // or we need to be very careful. For now, let's keep them alive.
            // But we should stop playback.

            setAudioInstance(null);
        };
    }, []);

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

    const seekRelative = useCallback((seconds) => {
        if (audioInstance) audioInstance.currentTime += seconds;
    }, [audioInstance]);

    const seekTo = useCallback((seconds) => {
        if (audioInstance) audioInstance.currentTime = seconds;
    }, [audioInstance]);

    const play = useCallback(async () => {
        if (!audioInstance) return;
        try {
            console.log("Starting Playback...");
            if (Tone.context.state !== 'running') {
                await Tone.start();
            }
            silentPlayerRef.current?.stop();
            await audioInstance.play();
            setIsPlaying(true);
            requestWakeLock();
            console.log("Playback Started");
        } catch (err) {
            console.error("Playback error:", err);
        }
    }, [audioInstance, requestWakeLock]);

    const pause = useCallback(() => {
        if (!audioInstance) {
            console.warn("Pause called but no audioInstance");
            return;
        }
        console.log("Pausing Playback...");
        audioInstance.pause();

        // Safely pause other player if crossfading logic messed up
        const otherPlayer = audioInstance === playerARef.current ? playerBRef.current : playerARef.current;
        otherPlayer.pause();

        if (silentPlayerRef.current && Tone.context.state === 'running') {
            silentPlayerRef.current.start();
        }
        setIsPlaying(false);
        releaseWakeLock();
        console.log("Playback Paused");
    }, [audioInstance, releaseWakeLock]);

    const stop = useCallback(() => {
        if (!audioInstance) return;

        // Stop all
        audioInstance.pause();
        audioInstance.currentTime = 0;

        playerARef.current.pause();
        playerARef.current.currentTime = 0;
        playerBRef.current.pause();
        playerBRef.current.currentTime = 0;

        silentPlayerRef.current?.stop();
        setIsPlaying(false);
        releaseWakeLock();
    }, [audioInstance, releaseWakeLock]);

    // Event Listeners & Media Session
    useEffect(() => {
        if (!audioInstance) return;

        const handleEnded = () => handleNext(true);
        const handleTimeUpdate = () => {
            setCurrentTime(audioInstance.currentTime);
            if ('mediaSession' in navigator && !isNaN(audioInstance.duration)) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: audioInstance.duration,
                        playbackRate: audioInstance.playbackRate,
                        position: audioInstance.currentTime
                    });
                } catch { /* ignore */ }
            }
        };
        const handleLoadedMetadata = () => setDuration(audioInstance.duration);
        const handlePause = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);

        audioInstance.addEventListener('ended', handleEnded);
        audioInstance.addEventListener('timeupdate', handleTimeUpdate);
        audioInstance.addEventListener('loadedmetadata', handleLoadedMetadata);
        audioInstance.addEventListener('pause', handlePause);
        audioInstance.addEventListener('play', handlePlay);

        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', play);
            navigator.mediaSession.setActionHandler('pause', pause);
            navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
            navigator.mediaSession.setActionHandler('nexttrack', () => handleNext(false));
            navigator.mediaSession.setActionHandler('seekbackward', () => seekRelative(-10));
            navigator.mediaSession.setActionHandler('seekforward', () => seekRelative(10));
        }

        return () => {
            audioInstance.removeEventListener('ended', handleEnded);
            audioInstance.removeEventListener('timeupdate', handleTimeUpdate);
            audioInstance.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audioInstance.removeEventListener('pause', handlePause);
            audioInstance.removeEventListener('play', handlePlay);
        };
    }, [audioInstance, handleNext, handlePrev, play, pause, seekRelative]);

    // Handle Track Loading & Crossfading
    useEffect(() => {
        if (currentTrackIndex >= 0 && tracks[currentTrackIndex]) {
            const track = tracks[currentTrackIndex];
            const fileBlob = track.file || track;
            const url = URL.createObjectURL(fileBlob);

            const currentPlayerId = activePlayerIdRef.current;
            // Use Ref for crossfade check to prevent Effect re-run
            const enableCrossfade = isCrossfadeEnabledRef.current;
            const duration = crossfadeDurationRef.current;

            const nextPlayerId = enableCrossfade ? (currentPlayerId === 'A' ? 'B' : 'A') : currentPlayerId;

            const targetPlayer = nextPlayerId === 'A' ? playerARef.current : playerBRef.current;
            const oldPlayer = nextPlayerId === 'A' ? playerBRef.current : playerARef.current;

            targetPlayer.src = url;

            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.name || fileBlob.name.replace(/\.[^/.]+$/, ""),
                    artist: track.artist || 'CyberPlayer',
                    album: track.album || 'Local Folder',
                    artwork: track.picture ? [{ src: track.picture, sizes: '512x512', type: 'image/png' }] : []
                });
            }

            if (isPlaying || Tone.context.state === 'running') {
                if (enableCrossfade && currentPlayerId !== nextPlayerId) {
                    console.log(`Crossfading ${currentPlayerId} -> ${nextPlayerId}`);
                    targetPlayer.play().then(() => {
                        setIsPlaying(true);
                        requestWakeLock();
                        const fadeTime = duration;
                        const targetValue = nextPlayerId === 'B' ? 1 : 0;
                        if (crossFadeRef.current) {
                            crossFadeRef.current.fade.rampTo(targetValue, fadeTime);
                        }
                        setTimeout(() => {
                            oldPlayer.pause();
                            oldPlayer.currentTime = 0;
                        }, fadeTime * 1000);
                    });
                } else {
                    if (currentPlayerId !== nextPlayerId) {
                        oldPlayer.pause();
                        oldPlayer.currentTime = 0;
                    }
                    if (crossFadeRef.current) {
                        crossFadeRef.current.fade.value = nextPlayerId === 'B' ? 1 : 0;
                    }
                    targetPlayer.play().then(() => {
                        setIsPlaying(true);
                        requestWakeLock();
                    }).catch(e => console.error("Play error", e));
                }
            } else {
                if (crossFadeRef.current) {
                    crossFadeRef.current.fade.value = nextPlayerId === 'B' ? 1 : 0;
                }
            }

            activePlayerIdRef.current = nextPlayerId;
            setAudioInstance(targetPlayer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTrackIndex, tracks, requestWakeLock]); // REMOVED isCrossfadeEnabled/duration from dependency

    // EQ Logic
    useEffect(() => {
        if (!isEqEnabled) {
            if (eqRef.current) {
                eqRef.current.low.rampTo(0, 0.1);
                eqRef.current.mid.rampTo(0, 0.1);
                eqRef.current.high.rampTo(0, 0.1);
            }
            return;
        }

        if (eqRef.current) {
            eqRef.current.low.rampTo(eqBands.low, 0.1);
            eqRef.current.mid.rampTo(eqBands.mid, 0.1);
            eqRef.current.high.rampTo(eqBands.high, 0.1);
        }
    }, [isEqEnabled, eqBands]);

    const setPreset = (name) => {
        setCurrentPreset(name);
        if (EQ_PRESETS[name]) {
            setEqBands(EQ_PRESETS[name]);
        }
    };

    const setEqBand = (band, value) => {
        setEqBands(prev => ({ ...prev, [band]: value }));
        setCurrentPreset('CUSTOM');
    };

    const toggleEq = useCallback(() => {
        setIsEqEnabled(prev => !prev);
    }, []);

    const toggle3D = useCallback(() => {
        setIs3DEnabled(prev => {
            const newState = !prev;
            if (widenerRef.current) {
                // 0 is mono/mid, 1 is wide side. For effect: 0 (Off/Normal) vs 1 (Wide)
                widenerRef.current.width.rampTo(newState ? 1 : 0, 0.2);
            }
            return newState;
        });
    }, []);

    const toggleCompressor = useCallback(() => {
        setIsCompressorEnabled(prev => {
            const newState = !prev;
            if (compressorRef.current) {
                // Stronger settings: Threshold -30dB, Ratio 8:1
                compressorRef.current.threshold.rampTo(newState ? -30 : 0, 0.1);
                compressorRef.current.ratio.rampTo(newState ? 8 : 1, 0.1);
            }
            return newState;
        });
    }, []);

    const toggleCrossfade = useCallback(() => setIsCrossfadeEnabled(prev => !prev), []);

    return {
        isPlaying,
        duration,
        currentTime,
        analyser: analyserRef.current,
        isEqEnabled,
        toggleEq,
        is3DEnabled,
        toggle3D,
        isCompressorEnabled,
        toggleCompressor,
        isCrossfadeEnabled,
        toggleCrossfade,
        crossfadeDuration,
        setCrossfadeDuration,
        currentPreset,
        setPreset,
        eqBands,
        setEqBand,
        isShuffle,
        setIsShuffle,
        repeatMode,
        setRepeatMode,
        audioControls: { play, pause, stop, handleNext, handlePrev, seekTo }
    };
}
