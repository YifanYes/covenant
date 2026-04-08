import type { CreatePostType, CreateReplyType } from '@shared/schemas/forum.schemas'
import { TRPCError } from '@trpc/server'
import { randomUUID } from 'crypto'
import { type PrismaClient, Prisma } from '@/generated/prisma'

const COMMENT_INCLUDE = {
  author: {
    select: {
      id: true,
      name: true,
      currentClass: true,
      title: true,
      factionName: true
    }
  }
} satisfies Prisma.ForumCommentInclude

const COMMENT_LIMIT = 500

export class ForumRepository {
  constructor(private prisma: PrismaClient) {}

  async createPost(authorId: string, input: CreatePostType) {
    const id = randomUUID()
    return this.prisma.forumComment.create({
      data: {
        id,
        rootId: id,
        title: input.title,
        content: input.content,
        faction: input.faction,
        authorId,
        parentId: null,
        depth: 0
      },
      include: COMMENT_INCLUDE
    })
  }

  async createReply(authorId: string, input: CreateReplyType, parentFaction: string, parentDepth: number, rootId: string) {
    return this.prisma.forumComment.create({
      data: {
        content: input.content,
        faction: parentFaction,
        authorId,
        parentId: input.parentId,
        rootId,
        depth: parentDepth + 1
      },
      include: COMMENT_INCLUDE
    })
  }

  async findPostsByFaction(faction: string) {
    const posts = await this.prisma.forumComment.findMany({
      where: { faction, parentId: null },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'desc' }
    })

    const postIds = posts.map((p) => p.id)
    const replyCounts = await this.prisma.forumComment.groupBy({
      by: ['rootId'],
      where: { rootId: { in: postIds }, parentId: { not: null } },
      _count: { id: true }
    })

    const countMap = new Map(replyCounts.map((r) => [r.rootId, r._count.id]))

    return posts.map((post) => ({
      ...post,
      _count: { children: countMap.get(post.id) ?? 0 }
    }))
  }

  async findByIdOrThrow(id: string) {
    const comment = await this.prisma.forumComment.findUnique({
      where: { id },
      include: COMMENT_INCLUDE
    })

    if (!comment) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Forum comment ${id} not found` })
    }

    return comment
  }

  async findPostWithAllDescendants(rootId: string) {
    const comments = await this.prisma.forumComment.findMany({
      where: { rootId },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
      take: COMMENT_LIMIT + 1
    })

    const hasMore = comments.length > COMMENT_LIMIT
    const limited = hasMore ? comments.slice(0, COMMENT_LIMIT) : comments

    const root = limited.find((c) => c.id === rootId)

    if (!root) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Post ${rootId} not found` })
    }

    if (root.parentId !== null) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'This is not a root post' })
    }

    const descendants = limited.filter((c) => c.id !== rootId)
    return { root, descendants, hasMore }
  }

  async update(id: string, data: { title?: string; content: string }) {
    return this.prisma.forumComment.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        content: data.content
      },
      include: COMMENT_INCLUDE
    })
  }

  async softDeletePost(id: string) {
    const deletedContent = '[deleted]'
    return this.prisma.forumComment.update({
      where: { id },
      data: {
        title: deletedContent,
        content: deletedContent
      },
      include: COMMENT_INCLUDE
    })
  }

  async delete(id: string) {
    return this.prisma.forumComment.delete({
      where: { id },
      include: COMMENT_INCLUDE
    })
  }
}
