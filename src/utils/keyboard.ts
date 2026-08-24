// Shortcut labels shown in the UI. The handlers accept both Cmd and Ctrl, so
// only the label has to follow the platform.

const platform =
  typeof navigator === 'undefined' ? '' : navigator.platform || navigator.userAgent

export const isMac = /Mac|iPhone|iPad|iPod/i.test(platform)

export const MOD_KEY_LABEL = isMac ? '⌘' : 'Ctrl'
export const SHIFT_KEY_LABEL = isMac ? '⇧' : 'Shift'

/** shortcutLabel('Z') → "⌘Z" on macOS, "Ctrl+Z" everywhere else. */
export function shortcutLabel(key: string, options: { shift?: boolean } = {}) {
  if (isMac) return `${options.shift ? SHIFT_KEY_LABEL : ''}${MOD_KEY_LABEL}${key}`
  return `Ctrl+${options.shift ? 'Shift+' : ''}${key}`
}
