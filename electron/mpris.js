import dbus from 'dbus-next';
import {app, ipcMain} from 'electron';
import Player from "mpris-service";

export function createMpris(window) {
  const renderer = window.webContents;

  const player = Player({
    name: 'moekoemusic',
    identity: 'MoeKoe Music',
  });

  player.on('next', () => renderer.send('next'));
  player.on('previous', () => renderer.send('previous'));
  player.on('playpause', () => renderer.send('playpause'));
  player.on('play', () => renderer.send('play'));
  player.on('pause', () => renderer.send('pause'));
  player.on('quit', () => app.exit());
  player.on('position', args =>
    renderer.send('setPosition', args.position / 1000 / 1000)
  );
  player.on('loopStatus', () => renderer.send('repeat'));
  player.on('shuffle', () => renderer.send('shuffle'));
  // 当外部通过 MPRIS 改变音量时触发
  player.on('volume', (value) => {
    renderer.send('volume_changed', value);
  })

  ipcMain.on('music-playing-check', (e, playing) => {
    player.playbackStatus = playing
      ? Player.PLAYBACK_STATUS_PLAYING
      : Player.PLAYBACK_STATUS_PAUSED;
  });

  ipcMain.on('metadata', (e, metadata) => {
    // console.log('接收到 metadata 事件');   // 调试用
    // 更新 Mpris 状态前将位置设为0, 否则 OSDLyrics 获取到的进度是上首音乐切换时的进度
    const x = {
      'mpris:trackid': player.objectPath('track/' + metadata.trackId),
      'mpris:artUrl': metadata.artwork[0].src,
      'mpris:length': metadata.length * 1000 * 1000,
      'xesam:title': metadata.title,
      'xesam:album': metadata.album,
      'xesam:artist': metadata.artist.split(','),
      'xesam:url': metadata.url,
    };
    player.getPosition = () => 0;
    player.metadata = x
  });

  ipcMain.on('playerCurrentTrackTime', (e, position) => {
    player.getPosition = () => position * 1000 * 1000;
    player.seeked(position * 1000 * 1000);
  });

  ipcMain.on('seeked', (e, position) => {
    player.seeked(position * 1000 * 1000);
  });

  ipcMain.on('switchRepeatMode', (e, mode) => {
    console.log(mode);
    switch (mode) {
      case 'off':
        player.loopStatus = Player.LOOP_STATUS_NONE;
        break;
      case 'one':
        player.loopStatus = Player.LOOP_STATUS_TRACK;
        break;
      case 'on':
        player.loopStatus = Player.LOOP_STATUS_PLAYLIST;
        break;
    }
  });

  ipcMain.on('switchShuffle', (e, shuffle) => {
    player.shuffle = shuffle;
  });

  ipcMain.on('setVolume', (e, volume) => {
    player.volume = volume;
  });

}

export async function createDbus(window) {
  const bus = dbus.sessionBus();
  const Variant = dbus.Variant;

  const osdService = await bus.getProxyObject(
    'org.osdlyrics.Daemon',
    '/org/osdlyrics/Lyrics'
  );

  const osdInterface = osdService.getInterface('org.osdlyrics.Lyrics');

  // 主进程
  ipcMain.on('sendLyrics', async (e, {track, lyrics}) => {
    // console.log('接收到 sendLyrics 事件');   // 调试用
    if (!track || !lyrics) {
      // console.warn('track 或 lyrics 为空！', {track, lyrics});
      return;
    }

    // console.log('Track 信息:', track);
    // console.log('歌词内容:', lyrics);

    try {
      const metadata = {
        title: new Variant('s', track.name),
        artist: new Variant('s', track.ar),
      };
      // 避免直接 Buffer.from(lyrics)，改用 TextEncoder
      const lyricBytes = new TextEncoder().encode(lyrics);
      await osdInterface.SetLyricContent(metadata, lyricBytes);
      // console.log('歌词已发送到 OSD');
      window.webContents.send('saveLyricFinished');
    } catch (err) {
      console.error('发送歌词到 OSD 失败:', err);
    }
  });

}
