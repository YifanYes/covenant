import { buildPageMetadata } from '../_lib/page-metadata'

export const generateMetadata = () => buildPageMetadata({ pageKey: 'story', path: '/story' })

export default function StoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
