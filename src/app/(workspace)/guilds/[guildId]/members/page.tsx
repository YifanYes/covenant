'use client'
import MemberList from '../../_components/member-list.component'
import { useGuild } from '../_guild-context'

export default function GuildMembersPage() {
  const { guild, myRole, myUserId } = useGuild()
  return (
    <MemberList
      guildId={guild.id}
      members={guild.members}
      availableTitles={guild.availableTitles ?? []}
      myUserId={myUserId}
      myRole={myRole}
    />
  )
}
