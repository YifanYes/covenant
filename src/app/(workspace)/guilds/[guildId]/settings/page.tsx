'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/ui/button.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import GuildDescriptionEditor from '../../_components/guild-description-editor.component'
import GuildDescriptionView from '../../_components/guild-description-view.component'
import InviteLinkCard from '../../_components/invite-link-card.component'
import TitlePoolEditor from '../../_components/title-pool-editor.component'
import { useGuild } from '../_guild-context'

export default function GuildSettingsPage() {
  const { t } = useTranslation()
  const { guild } = useGuild()
  const [editingDescription, setEditingDescription] = useState(false)

  return (
    <div className="space-y-4">
      <section className={`${panelChrome} p-5 space-y-3`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-title text-base">{t('guilds.description.edit_title')}</h3>
          {!editingDescription && (
            <Button size="sm" variant="outline" onClick={() => setEditingDescription(true)}>
              {t('guilds.description.edit_cta')}
            </Button>
          )}
        </div>
        {editingDescription ? (
          <GuildDescriptionEditor
            guildSlug={guild.slug}
            initialHtml={guild.description ?? ''}
            onClose={() => setEditingDescription(false)}
          />
        ) : guild.description ? (
          <GuildDescriptionView html={guild.description} />
        ) : (
          <p className="text-muted-foreground text-xs">{t('guilds.description.empty')}</p>
        )}
      </section>

      <TitlePoolEditor
        guildSlug={guild.slug}
        initialTitles={guild.availableTitles ?? []}
        memberTitles={guild.members.map((m) => m.user.character?.title ?? null)}
      />

      <InviteLinkCard guildSlug={guild.slug} />
    </div>
  )
}
