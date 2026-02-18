export interface CardLink {
  labelKey: string
  url: string
  icon: 'globe' | 'mail' | 'github' | 'linkedin' | 'message'
}

export interface CardData {
  slug: string
  nameKey: string
  quoteKey: string
  photo: string
  links: CardLink[]
}

export const cardDataMap: Record<string, CardData> = {
  denis: {
    slug: 'denis',
    nameKey: 'card.denis.name',
    quoteKey: 'card.denis.quote',
    photo: '/assets/team/denis.jpg',
    links: [
      { labelKey: 'card.links.app', url: 'https://arq-game.com', icon: 'globe' },
      { labelKey: 'card.links.email', url: 'mailto:info@arq-game.com', icon: 'mail' },
      { labelKey: 'card.links.x', url: 'https://x.com/subject.denis', icon: 'message' },
      { labelKey: 'card.links.github', url: 'https://github.com/SyreWolf', icon: 'github' },
      { labelKey: 'card.links.linkedin', url: 'https://www.linkedin.com/in/denisgudina', icon: 'linkedin' }
    ]
  },
  yifan: {
    slug: 'yifan',
    nameKey: 'card.yifan.name',
    quoteKey: 'card.yifan.quote',
    photo: '/assets/team/yifan.jpg',
    links: [
      { labelKey: 'card.links.app', url: 'https://arq-game.com', icon: 'globe' },
      { labelKey: 'card.links.email', url: 'mailto:info@arq-game.com', icon: 'mail' },
      { labelKey: 'card.links.x', url: 'https://x.com/yifan_yz', icon: 'message' },
      { labelKey: 'card.links.github', url: 'https://github.com/YifanYes', icon: 'github' },
      { labelKey: 'card.links.linkedin', url: 'https://www.linkedin.com/in/yifan-ye-zhang/', icon: 'linkedin' }
    ]
  }
}

export const allCardSlugs = Object.keys(cardDataMap)
