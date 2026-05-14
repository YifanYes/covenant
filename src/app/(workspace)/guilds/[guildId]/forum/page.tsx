'use client'
import GuildForum from '../../_components/guild-forum.component'
import { useGuild } from '../_guild-context'

export default function GuildForumPage() {
  const { guild, myRole, myUserId } = useGuild()
  return <GuildForum guildId={guild.id} myUserId={myUserId} myRole={myRole} />
}
