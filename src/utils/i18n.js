import { createI18n } from 'vue-i18n';
import en from '../language/en.json';
import ja from '../language/ja.json';
import ko from '../language/ko.json';
import ru from '../language/ru.json';
import zh_CN from '../language/zh-CN.json';
import zh_TW from '../language/zh-TW.json';

const messages = {
  en,
  ja,
  ko,
  ru,
  'zh-CN': zh_CN,
  'zh-TW': zh_TW,
};

const getBrowserLocale = () => {
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) {
    if (browserLang === 'zh-TW' || browserLang === 'zh-HK') {
      return 'zh-TW';
    }
    return 'zh-CN';
  }
  const lang = browserLang.split('-')[0];
  return Object.keys(messages).includes(lang) ? lang : 'ja';
};

const defaultLocale = JSON.parse(localStorage.getItem('settings'))?.['language'] || getBrowserLocale();

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: 'zh-CN',
  messages,
});

export default i18n;