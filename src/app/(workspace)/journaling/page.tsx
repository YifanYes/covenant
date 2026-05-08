'use client'

import { useTranslation } from 'react-i18next'
import EntryList from './_components/entry-list.component'
import JournalEditor from './_components/journal-editor.component'

export default function JournalingPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen w-full px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">{t('journaling.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('journaling.placeholder')}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <JournalEditor />
          <EntryList />
        </div>
      </div>
    </div>
  )
}
