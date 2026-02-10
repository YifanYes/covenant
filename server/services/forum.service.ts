import { Faction } from '@shared/constants/activities'
import type { CreatePostType, CreateReplyType, UpdateCommentType } from '@shared/schemas/forum.schemas'
import type { CommentAuthor, CommentNode } from '@shared/types/forum.types'
import { TRPCError } from '@trpc/server'
import type { CharacterRepository } from '../repositories/character.repository'
import type { ForumRepository } from '../repositories/forum.repository'

interface ForumCommentWithAuthor {
  id: string
  parentId: string | null
  title: string | null
  content: string
  faction: string
  authorId: string
  depth: number
  createdAt: Date
  updatedAt: Date
  author: CommentAuthor
}

export class ForumService {
  constructor(
    private forumRepository: ForumRepository,
    private characterRepository: CharacterRepository
  ) {}

  async getFactions() {
    return Object.values(Faction)
  }

  async joinFaction(userId: string, faction: Faction) {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    if (character.factionName !== '' && character.factionName !== faction) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You must leave your current faction before joining another'
      })
    }
    await this.characterRepository.updateFaction(character.id, faction)
    return { factionName: faction }
  }

  async leaveFaction(userId: string) {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    if (!character.factionName || character.factionName === '') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You are not in a faction'
      })
    }
    await this.characterRepository.updateFaction(character.id, '')
    return { success: true }
  }

  async getPosts(userId: string, faction: string) {
    await this.verifyFactionMembership(userId, faction)
    return this.forumRepository.findPostsByFaction(faction)
  }

  async getPostWithReplies(userId: string, id: string) {
    const post = await this.forumRepository.findByIdOrThrow(id)
    await this.verifyFactionMembership(userId, post.faction)
    const { root, descendants, hasMore } = await this.forumRepository.findPostWithAllDescendants(id)
    const tree = this.buildTree(root, descendants)
    return { ...tree, hasMore }
  }

  async createPost(userId: string, input: CreatePostType) {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    if (character.factionName !== input.faction) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only create posts in your own faction'
      })
    }
    return this.forumRepository.createPost(character.id, input)
  }

  async createReply(userId: string, input: CreateReplyType) {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    const parent = await this.forumRepository.findByIdOrThrow(input.parentId)
    if (character.factionName !== parent.faction) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only reply in your own faction'
      })
    }
    return this.forumRepository.createReply(character.id, input, parent.faction, parent.depth, parent.rootId)
  }

  async updateComment(userId: string, id: string, input: UpdateCommentType) {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    const comment = await this.forumRepository.findByIdOrThrow(id)
    if (comment.authorId !== character.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own comments' })
    }
    return this.forumRepository.update(id, input)
  }

  async deleteComment(userId: string, id: string) {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    const comment = await this.forumRepository.findByIdOrThrow(id)
    if (comment.authorId !== character.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own comments' })
    }

    if (comment.parentId === null) {
      return this.forumRepository.softDeletePost(id)
    }

    return this.forumRepository.delete(id)
  }

  private async verifyFactionMembership(userId: string, faction: string) {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    if (character.factionName !== faction) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this faction forum'
      })
    }
  }

  private toCommentNode(comment: ForumCommentWithAuthor): CommentNode {
    return {
      id: comment.id,
      parentId: comment.parentId,
      title: comment.title,
      content: comment.content,
      faction: comment.faction,
      authorId: comment.authorId,
      depth: comment.depth,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.author,
      children: []
    }
  }

  private buildTree(root: ForumCommentWithAuthor, descendants: ForumCommentWithAuthor[]): CommentNode {
    const nodeMap = new Map<string, CommentNode>()

    const rootNode = this.toCommentNode(root)
    nodeMap.set(root.id, rootNode)

    for (const desc of descendants) {
      nodeMap.set(desc.id, this.toCommentNode(desc))
    }

    for (const desc of descendants) {
      const node = nodeMap.get(desc.id)!
      const parent = nodeMap.get(desc.parentId!)
      if (parent) {
        parent.children.push(node)
      }
    }

    return rootNode
  }
}
