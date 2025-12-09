import * as mm from 'music-metadata-browser';

export const parseAudioFile = async (file) => {
    try {
        const metadata = await mm.parseBlob(file);
        const { common } = metadata;

        let pictureUrl = null;
        if (common.picture && common.picture.length > 0) {
            const picture = common.picture[0];
            const blob = new Blob([picture.data], { type: picture.format });
            pictureUrl = URL.createObjectURL(blob);
        }

        return {
            file, // Keep the original file for playback
            name: common.title || file.name.replace(/\.[^/.]+$/, ""),
            artist: common.artist || 'Desconocido',
            album: common.album || 'Desconocido',
            picture: pictureUrl,
            duration: metadata.format.duration || 0
        };
    } catch (error) {
        console.error('Error parsing metadata for file:', file.name, error);
        // Fallback
        return {
            file,
            name: file.name.replace(/\.[^/.]+$/, ""),
            artist: 'Desconocido',
            album: 'Desconocido',
            picture: null,
            duration: 0
        };
    }
};
