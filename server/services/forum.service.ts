import type {
  CreateCommentType,
  CreatePostType,
  UpdateCommentType,
  UpdatePostType
} from '@shared/schemas/forum.schemas'
import { Faction } from '@shared/schemas/forum.schemas'
import type { PrismaClient } from '../generated/prisma'
import { CharacterRepository } from '../repositories/character.repository'
import { ForumRepository, type ForumComment, type ForumPost } from '../repositories/forum.repository'

export class ForumService {
  private forumRepository: ForumRepository
  private characterRepository: CharacterRepository

  constructor(prisma: PrismaClient) {
    this.forumRepository = new ForumRepository(prisma)
    this.characterRepository = new CharacterRepository(prisma)
  }

  async getFactions() {
    return Object.values(Faction)
  }

  async joinFaction(userId: string, faction: Faction): Promise<{ factionName: string }> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    await this.characterRepository.updateFaction(character.id, faction)
    return { factionName: faction }
  }

  async leaveFaction(userId: string): Promise<{ success: boolean }> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    // We set it to an empty string to indicate "no faction"
    await this.characterRepository.updateFaction(character.id, '')
    return { success: true }
  }

  async getPosts(faction: string): Promise<ForumPost[]> {
    return this.forumRepository.findAllPostsByFaction(faction)
  }

  async getPostById(id: string): Promise<ForumPost> {
    return this.forumRepository.findPostByIdOrThrow(id)
  }

  async createPost(userId: string, input: CreatePostType): Promise<ForumPost> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    return this.forumRepository.createPost(character.id, input)
  }

  async updatePost(userId: string, id: string, input: UpdatePostType): Promise<ForumPost> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    return this.forumRepository.updatePost(id, character.id, input)
  }

  async deletePost(userId: string, id: string): Promise<ForumPost> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    return this.forumRepository.deletePost(id, character.id)
  }

  async getComments(postId: string): Promise<ForumComment[]> {
    return this.forumRepository.findAllCommentsByPost(postId)
  }

  async createComment(userId: string, input: CreateCommentType): Promise<ForumComment> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    return this.forumRepository.createComment(character.id, input)
  }

  async updateComment(userId: string, id: string, input: UpdateCommentType): Promise<ForumComment> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    return this.forumRepository.updateComment(id, character.id, input)
  }

  async deleteComment(userId: string, id: string): Promise<ForumComment> {
    const character = await this.characterRepository.findByUserIdOrThrow(userId)
    return this.forumRepository.deleteComment(id, character.id)
  }
}
