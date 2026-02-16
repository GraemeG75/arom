import { en } from './en';

type LocaleKey = 'en';
export type I18nVars = Record<string, string | number>;

const locales: Record<LocaleKey, Record<string, string>> = { en };
let currentLocale: LocaleKey = 'en';

export function setLocale(locale: LocaleKey): void {
  if (locales[locale]) {
    currentLocale = locale;
  }
}

export function t(key: string, vars?: I18nVars): string {
  const dict: Record<string, string> = locales[currentLocale] ?? locales.en;
  const template: string = dict[key] ?? key;
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_match: string, name: string) => String(vars[name] ?? `{${name}}`));
}
