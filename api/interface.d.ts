export type BufferLike<T = any> = Buffer | string | Object | Record<string | number | symbol, T>;

export type ExpressExtension = { server?: import('http').Server };

export type UseAxios = (config: UseAxiosRequestConfig) => Promise<UseAxiosResponse>;
export type UseModuleParams<T = any> = Record<string, T> & { cookie?: Record<string, string> };
export type UseModule = (req: UseModuleParams, useAxios: UseAxios) => Promise<UseAxiosResponse>;

export type ModuleDefinition = { identifier?: string; route: string; module: UseModule };
export type EncryptType = 'android' | 'web' | 'register';
export interface UseAxiosRequestConfig<T = any> {
  method: 'get' | 'GET' | 'post' | 'POST';
  url: string;
  baseURL?: string;
  params?: T;
  data?: T;
  headers?: Record<string, string | number>;
  cookie?: { [key: string]: string | number };
  encryptType: EncryptType;
  encryptKey?: boolean;
  clearDefaultParams?: boolean;
  ip?: string;
  realIP?: string;
}

export type APIBaseResponse = { data: any; errcode: number; status: number; error: string; [index: string]: unknown };

export interface UseAxiosResponse<T = APIBaseResponse> {
  status: number;
  body: T;
  cookie: string[];
  headers?: Record<string, string>;
}

export type RequestBaseConfig = { cookie?: { [key: string]: string | number }; realIP?: string; proxy?: string };

export type MultiPageConfig = { page?: number | string; pagesize?: number | string };

export function startService(): Promise<import('express').Express & ExpressExtension>;

export function getModulesDefinitions(modulesPath: string, specificRoute: Record<string, string>, doRequire?: boolean): Promise<ModuleDefinition[]>;

export function createRequest(params: UseAxiosRequestConfig): Promise<UseAxiosResponse>;

// API
export function login_cellphone(params: { mobile: number; code: number | string; userid?: string | number } & RequestBaseConfig): Promise<Response>;

export function login(params: { username: string; password: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function login_openplat(params: { code: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function login_qr_key(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export function login_qr_create(parmas: { key: string; qrimg?: boolean } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function login_qr_check(params: { key: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function login_wx_create(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export function login_wx_check(params: { uuid: string; timestamp?: string | number } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function login_token(params: { token: string; userid: string | number } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function captcha_sent(params: { mobile: string | number } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function register_dev(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export function user_detail(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export function user_playlist(params?: RequestBaseConfig & MultiPageConfig): Promise<UseAxiosResponse>;

export function user_follow(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export function user_listen(params?: { type?: 0 | 1 } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function user_history(params?: { bp?: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export enum PlaylistAdd {
  Add = 0,
  Collect = 1,
}

export function playlist_add(
  params: {
    name: string;
    list_create_userid: string | number;
    list_create_listid: number | string;
    type: PlaylistAdd.Collect;
    list_create_gid: string;
  } & RequestBaseConfig
): Promise<UseAxiosResponse>;

export function playlist_add(
  params: {
    name: string;
    list_create_userid: string | number;
    list_create_listid: number | string;
    type: PlaylistAdd.Add;
    is_pri?: 1 | 0;
  } & RequestBaseConfig
): Promise<UseAxiosResponse>;

export function playlist_del(params: { listid: number | string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function playlist_tracks_add(params: { listid: number | string; data: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function playlist_tracks_del(params: { listid: number | string; fileids: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export enum TopAlbum {
  ZH = 1,
  EA = 2,
  JP = 3,
  KR = 4,
}

export function top_album(params?: { type?: TopAlbum } & MultiPageConfig & RequestBaseConfig): Promise<UseAxiosResponse>;

export function album(params: { album_id: string; fields?: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function album_detail(params: { id: string | number } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function album_songs(params: { id: string | number } & MultiPageConfig & RequestBaseConfig): Promise<UseAxiosResponse>;

export enum SongURLQuality {
  Piano = 'piano',
  Acappella = 'acappella',
  Subwoofer = 'subwoofer',
  Ancient = 'ancient',
  Surnay = 'surnay',
  DJ = 'dj',
  128 = '128',
  320 = '320',
  Flac = 'flac',
  HiRes = 'high',
  ViperAtmos = 'viper_atmos',
  ViperClear = 'viper_clear',
  ViperTape = 'viper_tape',
}

export function song_url(
  params: {
    hash: string;
    album_id?: number | string;
    free_part?: boolean;
    album_audio_id?: number | string;
    quality?: SongURLQuality;
  } & RequestBaseConfig
): Promise<UseAxiosResponse>;

export function song_climax(params: { hash: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export enum SearchType {
  Special = 'special',
  Lyric = 'lyric',
  Song = 'song',
  Album = 'album',
  Author = 'author',
  MV = 'mv',
}

export function search(params: { keyword: string; type?: SearchType } & MultiPageConfig & RequestBaseConfig): Promise<UseAxiosResponse>;

export function search_default(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export function search_complex(params: { keyword: string } & MultiPageConfig & RequestBaseConfig): Promise<UseAxiosResponse>;

export function search_hot(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export function search_lyric(params: { keyword: string; album_audio_id?: string | number } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function search_lyric(params: { hash: string; album_audio_id?: string | number } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function lyric(
  params: { id: string | number; accesskey: string; fmt?: 'lrc' | 'krc'; decode?: boolean } & RequestBaseConfig
): Promise<UseAxiosResponse>;

export function playlist_tags(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export enum TopPlaylistCategory {
  Recommend = 0,
  HIRES = 11292,
}

export function top_playlist(
  params: { category_id: TopPlaylistCategory | number | string; withsong?: 0 | 1; withtag?: 0 | 1 } & RequestBaseConfig
): Promise<UseAxiosResponse>;

export function theme_playlist(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export function playlist_effect(params?: RequestBaseConfig): Promise<UseAxiosResponse>;

export function playlist_detail(params: { ids: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function playlist_track_all(params: { id: string } & MultiPageConfig & RequestBaseConfig): Promise<UseAxiosResponse>;

export function playlist_track_all_new(params: { lisdid: string | number } & MultiPageConfig & RequestBaseConfig): Promise<UseAxiosResponse>;

export function playlist_similar(params: { ids: string } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function theme_playlist_track(params: { theme_id: string | number } & RequestBaseConfig): Promise<UseAxiosResponse>;

export function theme_music(params?: RequestBaseConfig): Promise<UseAxiosResponse>;