export const CAMPAIGN_EVENT_TYPE = {
  ENEMY_KILL: 'ENEMY_KILL',
  HABIT_COMPLETION: 'HABIT_COMPLETION',
  TASK_COMPLETION: 'TASK_COMPLETION',
  GOLD_EARNED: 'GOLD_EARNED'
} as const

export type CampaignEventType = (typeof CAMPAIGN_EVENT_TYPE)[keyof typeof CAMPAIGN_EVENT_TYPE]

export const campaignEventTypeValues = [
  CAMPAIGN_EVENT_TYPE.ENEMY_KILL,
  CAMPAIGN_EVENT_TYPE.HABIT_COMPLETION,
  CAMPAIGN_EVENT_TYPE.TASK_COMPLETION,
  CAMPAIGN_EVENT_TYPE.GOLD_EARNED
] as const

export interface CampaignTemplate {
  id: string
  nameKey: string
  descriptionKey: string
  eventType: CampaignEventType
  defaultTarget: number
  durationDays: number
  rewardPool: { gold: number }
}

export const CAMPAIGN_TEMPLATES: readonly CampaignTemplate[] = [
  {
    id: 'KILL_RAMPAGE',
    nameKey: 'guilds.campaigns.templates.KILL_RAMPAGE.name',
    descriptionKey: 'guilds.campaigns.templates.KILL_RAMPAGE.description',
    eventType: CAMPAIGN_EVENT_TYPE.ENEMY_KILL,
    defaultTarget: 100,
    durationDays: 7,
    rewardPool: { gold: 500 }
  },
  {
    id: 'HABIT_CRUSADE',
    nameKey: 'guilds.campaigns.templates.HABIT_CRUSADE.name',
    descriptionKey: 'guilds.campaigns.templates.HABIT_CRUSADE.description',
    eventType: CAMPAIGN_EVENT_TYPE.HABIT_COMPLETION,
    defaultTarget: 50,
    durationDays: 7,
    rewardPool: { gold: 300 }
  },
  {
    id: 'TASK_SWEEP',
    nameKey: 'guilds.campaigns.templates.TASK_SWEEP.name',
    descriptionKey: 'guilds.campaigns.templates.TASK_SWEEP.description',
    eventType: CAMPAIGN_EVENT_TYPE.TASK_COMPLETION,
    defaultTarget: 75,
    durationDays: 7,
    rewardPool: { gold: 400 }
  },
  {
    id: 'GOLD_RUSH',
    nameKey: 'guilds.campaigns.templates.GOLD_RUSH.name',
    descriptionKey: 'guilds.campaigns.templates.GOLD_RUSH.description',
    eventType: CAMPAIGN_EVENT_TYPE.GOLD_EARNED,
    defaultTarget: 2000,
    durationDays: 7,
    rewardPool: { gold: 600 }
  }
]

export function getCampaignTemplate(id: string): CampaignTemplate | undefined {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === id)
}

export const campaignTemplateIds = CAMPAIGN_TEMPLATES.map((t) => t.id) as readonly string[]
