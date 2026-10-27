export const APP_THEMES = {
  'com.whatsapp': { name: 'WhatsApp', color: '#25D366', glow: 'rgba(37, 211, 102, 0.45)', icon: 'chat' },
  'com.whatsapp.w4b': { name: 'WhatsApp Business', color: '#25D366', glow: 'rgba(37, 211, 102, 0.45)', icon: 'chat' },
  'com.facebook.orca': { name: 'Messenger', color: '#0084FF', glow: 'rgba(0, 132, 255, 0.45)', icon: 'forum' },
  'com.facebook.katana': { name: 'Facebook', color: '#1877F2', glow: 'rgba(24, 119, 242, 0.45)', icon: 'public' },
  'org.telegram.messenger': { name: 'Telegram', color: '#229ED9', glow: 'rgba(34, 158, 217, 0.45)', icon: 'send' },
  'org.thunderdog.challegram': { name: 'Telegram X', color: '#229ED9', glow: 'rgba(34, 158, 217, 0.45)', icon: 'send' },
  'com.instagram.android': { name: 'Instagram', color: '#E1306C', glow: 'rgba(225, 48, 108, 0.45)', icon: 'photo_camera' },
  'com.google.android.youtube': { name: 'YouTube', color: '#FF0033', glow: 'rgba(255, 0, 51, 0.45)', icon: 'play_circle' },
  'com.google.android.gm': { name: 'Gmail', color: '#EA4335', glow: 'rgba(234, 67, 53, 0.45)', icon: 'mail' },
  'com.google.android.apps.messaging': { name: 'Messages', color: '#1A73E8', glow: 'rgba(26, 115, 232, 0.45)', icon: 'sms' },
  'com.android.mms': { name: 'Messages', color: '#1A73E8', glow: 'rgba(26, 115, 232, 0.45)', icon: 'sms' },
  'com.discord': { name: 'Discord', color: '#5865F2', glow: 'rgba(88, 101, 242, 0.45)', icon: 'headset_mic' },
  'com.spotify.music': { name: 'Spotify', color: '#1DB954', glow: 'rgba(29, 185, 84, 0.45)', icon: 'music_note' },
  'com.twitter.android': { name: 'X', color: '#1DA1F2', glow: 'rgba(29, 161, 242, 0.45)', icon: 'tag' },
  'com.snapchat.android': { name: 'Snapchat', color: '#FFFC00', glow: 'rgba(255, 252, 0, 0.45)', icon: 'bolt' },
  'com.reddit.frontpage': { name: 'Reddit', color: '#FF4500', glow: 'rgba(255, 69, 0, 0.45)', icon: 'local_fire_department' },
  'com.google.android.dialer': { name: 'Phone', color: '#00E676', glow: 'rgba(0, 230, 118, 0.45)', icon: 'call' },
  'com.android.dialer': { name: 'Phone', color: '#00E676', glow: 'rgba(0, 230, 118, 0.45)', icon: 'call' },
  'com.samsung.android.dialer': { name: 'Phone', color: '#00E676', glow: 'rgba(0, 230, 118, 0.45)', icon: 'call' },
}

export function getAppTheme(packageId = '', appName = '') {
  const pkg = (packageId || '').toLowerCase()
  const name = (appName || '').toLowerCase()

  if (APP_THEMES[pkg]) return APP_THEMES[pkg]

  for (const [key, theme] of Object.entries(APP_THEMES)) {
    if (pkg.includes(key) || (theme.name && name.includes(theme.name.toLowerCase()))) {
      return theme
    }
  }

  if (pkg.includes('dialer') || pkg.includes('phone') || name.includes('phone') || name.includes('call')) {
    return { name: appName || 'Phone', color: '#00E676', glow: 'rgba(0, 230, 118, 0.45)', icon: 'call' }
  }
  if (pkg.includes('mail') || name.includes('mail')) {
    return { name: appName || 'Mail', color: '#EA4335', glow: 'rgba(234, 67, 53, 0.45)', icon: 'mail' }
  }
  if (pkg.includes('message') || pkg.includes('sms') || name.includes('message')) {
    return { name: appName || 'Messages', color: '#1A73E8', glow: 'rgba(26, 115, 232, 0.45)', icon: 'sms' }
  }
  if (pkg.includes('music') || name.includes('music')) {
    return { name: appName || 'Music', color: '#1DB954', glow: 'rgba(29, 185, 84, 0.45)', icon: 'music_note' }
  }
  if (pkg.includes('chat') || name.includes('chat')) {
    return { name: appName || 'Chat', color: '#00F2FF', glow: 'rgba(0, 242, 255, 0.45)', icon: 'chat' }
  }

  return {
    name: appName || 'Notification',
    color: '#00F2FF',
    glow: 'rgba(0, 242, 255, 0.35)',
    icon: 'notifications'
  }
}
