import { post } from './request';

const pick = (record, ...keys) => {
    for (const key of keys) {
        const value = record?.[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
};

const firstValue = (...values) => values.find(value => value !== undefined && value !== null && value !== '') || '';

const normalizeCover = (cover) => cover ? String(cover).replace('{size}', 480) : './assets/images/ico.png';

const mapRecognizeMatch = (item) => {
    const album = Array.isArray(item.album) ? item.album[0] || {} : {};
    const hash = pick(item, 'hash', 'hash_128', 'FileHash', 'hash_320', 'hash_flac');
    const name = pick(item, 'songname', 'filename', 'name', '未知歌曲');
    const author = pick(item, 'singername', 'author_name', 'singer', '未知歌手');
    const duration = Number(pick(item, 'timelength', 'timelength_128', 'timelength_320', 'duration')) || 0;
    const dist = Number(item.dist);

    return {
        confidence: Number.isFinite(dist) ? Math.max(0, Math.min(1, 1 - dist)) : 0,
        song: {
            FileHash: hash,
            HQFileHash: pick(item, 'hash_320'),
            SQFileHash: pick(item, 'hash_flac', 'hash_high'),
            OriSongName: `${author} - ${name}`,
            SongName: name,
            SingerName: author,
            AlbumName: firstValue(album.albumname, item.album_name, item.albumname),
            Image: normalizeCover(firstValue(item.union_cover, album.sizable_cover, item.album_sizable_cover, item.cover)),
            Duration: duration > 1000 ? duration : duration * 1000,
            FileName: `${author} - ${name}`,
        },
    };
};

export const recognizeAudio = async (pcm) => {
    const response = await post('/audio/match', new Uint8Array(pcm), {
        headers: { 'Content-Type': 'application/octet-stream' },
        params: { t: Date.now() },
        timeout: 30000,
    });

    if (response?.status !== 1 || !Array.isArray(response.data)) return [];
    return response.data
        .map(mapRecognizeMatch)
        .filter(match => match.song.FileHash)
        .sort((a, b) => b.confidence - a.confidence);
};
