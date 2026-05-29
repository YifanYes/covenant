'use client'
import CampaignPanel from '../../_components/campaign-panel.component'
import { useGuild } from '../_guild-context'

export default function GuildCampaignsPage() {
  const { guild, myRole, myUserId } = useGuild()
  return <CampaignPanel guildSlug={guild.slug} myUserId={myUserId} myRole={myRole} members={guild.members} />
}
