import type {
  CreateCommentType,
  CreatePostType,
  Faction,
  UpdateCommentType,
  UpdatePostType
} from '@shared/schemas/forum.schemas'
import { TRPCError } from '@trpc/server'
import { type PrismaClient, Prisma } from '../generated/prisma'

const POST_INCLUDE = {
  author: true,
  _count: {
    select: { comments: true }
  }
} satisfies Prisma.PostInclude

export interface ForumAuthor {
  id: string
  name: string
  currentClass: string
  title: string | null
  factionName: string
  tier?: number
}

export interface ForumPost {
  id: string
  title: string
  description: string
  faction: string
  authorId: string
  author: ForumAuthor
  createdAt: Date
  updatedAt: Date
  _count: {
    comments: number
  }
}

const COMMENT_INCLUDE = {
  author: true
} satisfies Prisma.CommentInclude

export interface ForumComment {
  id: string
  content: string
  postId: string
  authorId: string
  author: ForumAuthor
  createdAt: Date
  updatedAt: Date
}

export class ForumRepository {
  constructor(private prisma: PrismaClient) {}

  async createPost(authorId: string, input: CreatePostType): Promise<ForumPost> {
    return this.prisma.post.create({
      data: {
        title: input.title,
        description: input.description,
        faction: input.faction,
        authorId
      },
      include: POST_INCLUDE
    })
  }

  async findAllPostsByFaction(faction: Faction): Promise<ForumPost[]> {
    return this.prisma.post.findMany({
      where: { faction },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' }
    })
  }

  async findPostByIdOrThrow(id: string): Promise<ForumPost> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: POST_INCLUDE
    })

    if (!post) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Post ${id} not found` })
    }

    return post
  }

  async updatePost(id: string, authorId: string, input: UpdatePostType): Promise<ForumPost> {
    const post = await this.findPostByIdOrThrow(id)
    if (post.authorId !== authorId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own posts' })
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description
      },
      include: POST_INCLUDE
    })
  }

  async deletePost(id: string, authorId: string): Promise<ForumPost> {
    const post = await this.findPostByIdOrThrow(id)
    if (post.authorId !== authorId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own posts' })
    }

    return this.prisma.post.delete({
      where: { id },
      include: POST_INCLUDE
    })
  }

  async createComment(authorId: string, input: CreateCommentType): Promise<ForumComment> {
    return this.prisma.comment.create({
      data: {
        content: input.content,
        postId: input.postId,
        authorId
      },
      include: COMMENT_INCLUDE
    })
  }

  async findAllCommentsByPost(postId: string): Promise<ForumComment[]> {
    return this.prisma.comment.findMany({
      where: { postId },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'asc' }
    })
  }

  async findCommentByIdOrThrow(id: string): Promise<ForumComment> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: COMMENT_INCLUDE
    })

    if (!comment) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Comment ${id} not found` })
    }

    return comment
  }

  async updateComment(id: string, authorId: string, input: UpdateCommentType): Promise<ForumComment> {
    const comment = await this.findCommentByIdOrThrow(id)
    if (comment.authorId !== authorId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own comments' })
    }

    return this.prisma.comment.update({
      where: { id },
      data: {
        content: input.content
      },
      include: COMMENT_INCLUDE
    })
  }

  async deleteComment(id: string, authorId: string): Promise<ForumComment> {
    const comment = await this.findCommentByIdOrThrow(id)
    if (comment.authorId !== authorId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own comments' })
    }

    return this.prisma.comment.delete({
      where: { id },
      include: COMMENT_INCLUDE
    })
  }
}
