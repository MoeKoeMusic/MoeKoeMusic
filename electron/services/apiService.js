import createServer from '../util/kugouapi/createServer.js';

class ApiService {
    constructor() {
        this.app = null;
        this.server = null;
        this.clients = new Set();
        this.currentLyrics = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.mainWindow = null;
    }
    init(mainWindow) {
        this.mainWindow = mainWindow;
    }
    /**
     * 开启外部 API 服务
     * @param {object} config 外部 API 服务配置
     * @param {string | null | undefined} config.host 监听主机
     * @param {number | null | undefined} config.port 监听端口
     * @param {string | null | undefined} config.wsPath WebSocket 监听地址
     * @returns 
     */
    start(config) {
        if (this.app) return;
        this.app = createServer();

        config = {
            host: '127.0.0.1',
            port: 6520,
            wsPath: '/moekoe',
            ...config
        }
        if(config.wsPath && !config.wsPath.startsWith('/'))
            config.wsPath = `/${config.wsPath}`;

        this.app.ws(config.wsPath, async (req, res) => {
            const ws = await res.accept();

            this.clients.add(ws);
            //发送欢迎信息
            ws.send(JSON.stringify({
                type: 'welcome',
                data: '感谢接入MoeKoe Music，文档地址：https://music.moekoe.cn/'
            }));

            // 发送当前歌词
            if (this.currentLyrics) {
                ws.send(JSON.stringify({
                    type: 'lyrics',
                    data: this.currentLyrics
                }));
            }

            // 发送当前播放状态
            ws.send(JSON.stringify({
                type: 'playerState',
                data: {
                    isPlaying: this.isPlaying,
                    currentTime: this.currentTime
                }
            }));

            // 处理来自客户端的消息
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    console.log(data);
                    if (data.type === 'control') {
                        this.handleControlCommand(data.data);
                    }
                } catch (e) {
                    console.error('无效的 WebSocket 消息', e);
                }
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('WebSocket 客户端已断开连接');
            });
        });

        this.server = this.app.createServer();
        this.server.listen(config.port, config.host, () => {
            console.log(`KuGouMusicApi server running at http://${config.host}:${config.port}`);
            console.log(`WebSocket server running at ws://${config.host}:${config.port}${config.wsPath}`);
        });
    }

    stop() {
        if (this.app) {
            for (const client of this.clients) {
                client.close();
            }
            this.clients.clear();
            this.server.close();
            this.server = null;
            console.log('外部 API 服务已停止');
        }
    }

    // 广播到所有客户端
    broadcastToClients(data) {
        if (!this.app) return;
        const message = JSON.stringify(data);
        for (const client of this.clients) {
            if (client.readyState === 1) {
                client.send(message);
            }
        }
    }

    handleControlCommand(data) {
        if (!this.mainWindow) return;
        switch (data.command) {
            case 'toggle': // 切换播放状态
                this.mainWindow.webContents.send('toggle-play-pause');
                break;
            case 'next': // 下一首
                this.mainWindow.webContents.send('play-next-track');
                break;
            case 'prev': // 上一首
                this.mainWindow.webContents.send('play-previous-track');
                break;
        }
    }

    // 更新歌词数据
    updateLyrics(lyricsData) {
        this.currentLyrics = lyricsData;
        this.broadcastToClients({
            type: 'lyrics',
            data: lyricsData
        });
    }

    // 更新播放状态
    updatePlayerState(state) {
        this.isPlaying = state.isPlaying;
        this.currentTime = state.currentTime;
        this.broadcastToClients({
            type: 'playerState',
            data: state
        });
    }
}

const apiService = new ApiService();
export default apiService; 