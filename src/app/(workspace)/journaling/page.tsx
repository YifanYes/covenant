'use client'

import { useTranslation } from 'react-i18next'
import EntryList from './_components/entry-list.component'
import JournalEditor from './_components/journal-editor.component'

export default function JournalingPage() {
  const { t } = useTranslation()

  return (
    // Desktop app-shell: fill the viewport (layout adds py-6 => -3rem) so the page
    // itself never scrolls. Each column owns its scroll. Mobile keeps natural flow.
    <div className="flex w-full flex-col lg:h-[calc(100dvh-3rem)]">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
        <div className="mb-6 shrink-0">
          <h1 className="text-2xl font-semibold">{t('journaling.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('journaling.placeholder')}</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <div className="scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent min-h-0 lg:overflow-y-auto lg:pr-1">
            <JournalEditor />
          </div>
          <div className="min-h-0">
            <EntryList />
          </div>
        </div>
      </div>
    </div>
  )
}
