import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { get, post } from '@/utils/request';

const m = (s) => `[听歌时长] ${s}`;

export const useListenTimeStore = defineStore('listen-time', () => {
	const _listenTime = ref(0);
	const listenTime = computed(() => _listenTime.value);

	/** 刷新时长 */
	const refreshListenTime = async () => {
		try {
			const result = await get(`/user/grade/info?t=${Date.now()}`);
			_listenTime.value = result.data.d_sec || 0;
			console.log(m('刷新成功'), listenTime.value);
			return result;
		} catch(e) {
			console.error(m('刷新失败'), e);
			return null;
		}
	}
	refreshListenTime();

	/** 生成 CSCC 事件载体 */
	const generateCsccJson = (type, data) => {
		const cscc = {
			event: '',
			mixsongid: data.mixsongid,
			duration: data.duration,
			state: undefined,
			d_sec: data.d_sec ?? listenTime.value,
			diff_sec: data.diff_sec
		}
		switch(type) {
			case 'start':
				cscc.event = 'start';
				// 清理不需要的参数
				delete cscc.duration; delete cscc.state;
				delete cscc.d_sec; delete cscc.diff_sec;
				break;
			case 'end':
				cscc.event = 'end', cscc.state = '完整播放';
				break;
			case 'switch':
				cscc.event = 'end', cscc.state = '中断播放';
				break;
		}
		return cscc;
	}

	/**
	 * 上报 CSCC 事件载体
	 * @param {ReturnType<typeof generateCsccJson>} csccJson 
	 * @returns 
	 */
	const reportCsccJson = (csccJson) => {
		return post('/user/listen/report', csccJson);
	}

	/**
	 * 上报 CSCC 事件
	 * @param {'start' | 'end' | 'switch'} type 事件类型
	 * @param {object} data 必要数据
	 * @param {number} data.mixsongid 歌曲 MixSongID
	 * @param {number | undefined} data.d_sec 查询到的上次时长（秒，可选）
	 * @param {number} data.diff_sec 差异时间（实际持续时间取整，秒）
	 * @param {number} data.duration 实际持续时间（毫秒）
	 * @returns 
	 */
	const reportCsccEvent = async (type, data) => {
		try {
			const result = await reportCsccJson(generateCsccJson(type, data));
			// if(result.data.playback_accepted) {
			// 	console.log(m('已上报 CSCC 事件'), type);
			// } else {
			// 	console.warn(m('CSCC 事件上报失败'), result.data.report);
			// }
			// if(result.data.grade_synced) {
			// 	console.log(m('已同步时长'));
			// 	_listenTime.value = result.data.grade.d_sec || 0;
			// } else {
			// 	console.warn(m('时长同步失败'), result.data.grade);
			// }
			// 这里有个坑 不知道为什么实际总是返回
			// { errcode: 0, status: 1 }
			return result;
		} catch(e) {
			console.error(m('上报 CSCC 事件出错'), e);
			return null;
		}
	}

	return {
		listenTime,
		refreshListenTime,
		reportCsccEvent
	}
});