import { createContext, useContext } from 'react'
import { en, type Dict } from './en'
import { id } from './id'

export type Lang = 'id' | 'en'
export type Unit = 'cm' | 'in'

const DICTS: Record<Lang, Dict> = { en, id }

export type T = (key: keyof Dict, vars?: Record<string, string | number>) => string

export interface Settings {
  lang: Lang
  unit: Unit
  t: T
  setLang: (l: Lang) => void
  setUnit: (u: Unit) => void
}

export const makeT =
  (lang: Lang): T =>
  (key, vars) => {
    let s: string = DICTS[lang][key] ?? String(key)
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }

/**
 * Count with the right singular/plural wording. English needs it; Indonesian does not inflect
 * for number, so its two forms are deliberately identical.
 */
export const plural = (t: T, key: 'customerCount' | 'orderCount', n: number) =>
  t(n === 1 ? (`${key}_one` as keyof Dict) : key, { n })

/** Field/option labels are looked up by prefix so stored keys stay stable and renameable. */
export const label = (t: T, prefix: string, key: string) =>
  t(`${prefix}${key}` as keyof Dict) === `${prefix}${key}`
    ? key.replaceAll('_', ' ')
    : t(`${prefix}${key}` as keyof Dict)

export const DEFAULT_LANG: Lang = 'en'

export const SettingsContext = createContext<Settings>({
  lang: DEFAULT_LANG,
  unit: 'cm',
  t: makeT(DEFAULT_LANG),
  setLang: () => {},
  setUnit: () => {},
})

export const useSettings = () => useContext(SettingsContext)
