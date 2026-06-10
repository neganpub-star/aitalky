// 轻量 i18n(信使端只需中英两套文案,不引 react-i18next)。lang 来自 URL ?lang=
const dict = {
  zh_CN: {
    greetingTitle: '您好!',
    greetingSub: '您可以询问任何问题,或分享您的建议。',
    recent: '最近对话',
    startChat: '发起对话',
    noRecent: '还没有对话,发起一个吧',
    inputPlaceholder: '请输入...',
    send: '发送',
    connecting: '连接中...',
    offline: '网络已断开,正在重连...',
    loadFail: '初始化失败,请检查接入地址的 appId 是否正确',
    today: '今天',
    backHome: '返回',
    replyTimeFew: '我们将在几分钟后回复',
    replyTimeHours: '我们将在几小时后回复',
    replyTimeDay: '我们将在一天内回复',
  },
  en_US: {
    greetingTitle: 'Hi there!',
    greetingSub: 'Ask us anything, or share your feedback.',
    recent: 'Recent',
    startChat: 'Start a conversation',
    noRecent: 'No conversation yet, start one',
    inputPlaceholder: 'Type a message...',
    send: 'Send',
    connecting: 'Connecting...',
    offline: 'Disconnected, reconnecting...',
    loadFail: 'Init failed — please check the appId in the access URL',
    today: 'Today',
    backHome: 'Back',
    replyTimeFew: 'We will reply within a few minutes',
    replyTimeHours: 'We will reply within a few hours',
    replyTimeDay: 'We will reply within a day',
  },
} as const

export type Lang = keyof typeof dict
export type I18nKey = keyof (typeof dict)['zh_CN']

let current: Lang = 'zh_CN'

export function setLang(lang: string) {
  current = lang === 'en_US' || lang === 'en' ? 'en_US' : 'zh_CN'
}

export function t(key: I18nKey): string {
  return dict[current][key]
}
