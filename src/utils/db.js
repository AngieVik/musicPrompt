import { openDB } from 'idb';

const DB_NAME = 'MusicPlayerDB';
const STORE_TRACKS = 'tracks';
const STORE_PLAYLISTS = 'playlists';

export const initDB = async () => {
    return openDB(DB_NAME, 2, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_TRACKS)) {
                db.createObjectStore(STORE_TRACKS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
                const playlistStore = db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id', autoIncrement: true });
                // Initialize with a default "Most Played" playlist if it doesn't exist
                playlistStore.add({ title: 'Más Escuchadas', description: 'Tus canciones favoritas', tracks: [] });
            }
        },
    });
};

// --- Tracks ---

export const saveTrack = async (track) => {
    const db = await initDB();
    return db.add(STORE_TRACKS, track);
};

export const getAllTracks = async () => {
    const db = await initDB();
    return db.getAll(STORE_TRACKS);
};

export const deleteTrack = async (id) => {
    const db = await initDB();
    return db.delete(STORE_TRACKS, id);
};

export const clearTracks = async () => {
    const db = await initDB();
    return db.clear(STORE_TRACKS);
};

// --- Playlists ---

export const savePlaylist = async (playlist) => {
    const db = await initDB();
    return db.add(STORE_PLAYLISTS, { ...playlist, tracks: [] });
};

export const getAllPlaylists = async () => {
    const db = await initDB();
    return db.getAll(STORE_PLAYLISTS);
};


export const getPlaylist = async (id) => {
    const db = await initDB();
    return db.get(STORE_PLAYLISTS, id);
};
