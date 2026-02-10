export interface CommentAuthor {
  id: string
  name: string
  currentClass: string
  title: string | null
  factionName: string
}

export interface CommentNode {
  id: string
  parentId: string | null
  title: string | null
  content: string
  faction: string
  authorId: string
  depth: number
  createdAt: Date | string
  updatedAt: Date | string
  author: CommentAuthor
  children: CommentNode[]
}
