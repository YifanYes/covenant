import i18n from '@/i18n'

export const parseTranslationKey = (translationKey: string) =>
  i18n.exists(translationKey) ? i18n.t(translationKey) : translationKey
