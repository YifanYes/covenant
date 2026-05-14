'use client'
import InviteLinkCard from '../../_components/invite-link-card.component'
import { useGuild } from '../_guild-context'

export default function GuildSettingsPage() {
  const { guild } = useGuild()

  return (
    <div className="space-y-4">
      <InviteLinkCard guildId={guild.id} />
    </div>
  )
}
