import { Faction } from '@shared/constants/activities'
import { TRPCError } from '@trpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForumService } from '../../services/forum.service'

const mockForumComment = (overrides = {}) => ({
  id: 'comment-1',
  parentId: null,
  rootId: 'comment-1',
  title: 'Test Post',
  content: 'Test content',
  faction: Faction.HOLY_KNIGHTS,
  authorId: 'char-123',
  depth: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  author: {
    id: 'char-123',
    name: 'Test Character',
    currentClass: 'TEMPLAR',
    title: null,
    factionName: Faction.HOLY_KNIGHTS
  },
  ...overrides
})

describe('ForumService', () => {
  let forumService: ForumService
  let mockForumRepo: any
  let mockCharacterRepo: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockForumRepo = {
      createPost: vi.fn(),
      createReply: vi.fn(),
      findPostsByFaction: vi.fn(),
      findByIdOrThrow: vi.fn(),
      findPostWithAllDescendants: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      softDeletePost: vi.fn()
    }

    mockCharacterRepo = {
      findByUserIdOrThrow: vi.fn(),
      updateFaction: vi.fn()
    }

    forumService = new ForumService(mockForumRepo, mockCharacterRepo)
  })

  describe('getFactions', () => {
    it('should return all faction values', async () => {
      const result = await forumService.getFactions()
      expect(result).toEqual(Object.values(Faction))
    })
  })

  describe('joinFaction', () => {
    it('should join a faction when character has no faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: ''
      })

      const result = await forumService.joinFaction('user-1', Faction.HOLY_KNIGHTS)

      expect(result).toEqual({ factionName: Faction.HOLY_KNIGHTS })
      expect(mockCharacterRepo.updateFaction).toHaveBeenCalledWith('char-123', Faction.HOLY_KNIGHTS)
    })

    it('should allow rejoining the same faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })

      const result = await forumService.joinFaction('user-1', Faction.HOLY_KNIGHTS)

      expect(result).toEqual({ factionName: Faction.HOLY_KNIGHTS })
      expect(mockCharacterRepo.updateFaction).toHaveBeenCalled()
    })

    it('should throw when trying to join a different faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })

      await expect(forumService.joinFaction('user-1', Faction.LEGION)).rejects.toThrow(TRPCError)
      expect(mockCharacterRepo.updateFaction).not.toHaveBeenCalled()
    })
  })

  describe('leaveFaction', () => {
    it('should set faction to empty string', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })

      const result = await forumService.leaveFaction('user-1')

      expect(result).toEqual({ success: true })
      expect(mockCharacterRepo.updateFaction).toHaveBeenCalledWith('char-123', '')
    })

    it('should throw when character has no faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: ''
      })

      await expect(forumService.leaveFaction('user-1')).rejects.toThrow(TRPCError)
      expect(mockCharacterRepo.updateFaction).not.toHaveBeenCalled()
    })
  })

  describe('getPosts', () => {
    it('should delegate to repository when user belongs to faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })
      const posts = [mockForumComment()]
      mockForumRepo.findPostsByFaction.mockResolvedValue(posts)

      const result = await forumService.getPosts('user-1', Faction.HOLY_KNIGHTS)

      expect(result).toEqual(posts)
      expect(mockForumRepo.findPostsByFaction).toHaveBeenCalledWith(Faction.HOLY_KNIGHTS)
    })

    it('should throw when user does not belong to the faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.LEGION
      })

      await expect(forumService.getPosts('user-1', Faction.HOLY_KNIGHTS)).rejects.toThrow(TRPCError)
      expect(mockForumRepo.findPostsByFaction).not.toHaveBeenCalled()
    })

    it('should throw when user has left their faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: ''
      })

      await expect(forumService.getPosts('user-1', Faction.HOLY_KNIGHTS)).rejects.toThrow(TRPCError)
      expect(mockForumRepo.findPostsByFaction).not.toHaveBeenCalled()
    })
  })

  describe('getPostWithReplies', () => {
    it('should return post with hasMore flag', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })
      const root = mockForumComment({ id: 'root' })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(root)
      mockForumRepo.findPostWithAllDescendants.mockResolvedValue({
        root,
        descendants: [],
        hasMore: false
      })

      const result = await forumService.getPostWithReplies('user-1', 'root')

      expect(result.id).toBe('root')
      expect(result.hasMore).toBe(false)
    })

    it('should propagate hasMore true when descendants are truncated', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })
      const root = mockForumComment({ id: 'root' })
      const child = mockForumComment({ id: 'child-1', parentId: 'root', depth: 1 })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(root)
      mockForumRepo.findPostWithAllDescendants.mockResolvedValue({
        root,
        descendants: [child],
        hasMore: true
      })

      const result = await forumService.getPostWithReplies('user-1', 'root')

      expect(result.hasMore).toBe(true)
      expect(result.children).toHaveLength(1)
    })

    it('should throw when user does not belong to post faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.LEGION
      })
      const root = mockForumComment({ id: 'root', faction: Faction.HOLY_KNIGHTS })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(root)

      await expect(forumService.getPostWithReplies('user-1', 'root')).rejects.toThrow(TRPCError)
      expect(mockForumRepo.findPostWithAllDescendants).not.toHaveBeenCalled()
    })
  })

  describe('createPost', () => {
    it('should create a post when user belongs to the faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })
      const input = { title: 'Test', content: 'Content', faction: Faction.HOLY_KNIGHTS }
      const created = mockForumComment()
      mockForumRepo.createPost.mockResolvedValue(created)

      const result = await forumService.createPost('user-1', input)

      expect(result).toEqual(created)
      expect(mockForumRepo.createPost).toHaveBeenCalledWith('char-123', input)
    })

    it('should throw when user posts in a different faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.LEGION
      })
      const input = { title: 'Test', content: 'Content', faction: Faction.HOLY_KNIGHTS }

      await expect(forumService.createPost('user-1', input)).rejects.toThrow(TRPCError)
      expect(mockForumRepo.createPost).not.toHaveBeenCalled()
    })

    it('should throw when user has left their faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: ''
      })
      const input = { title: 'Test', content: 'Content', faction: Faction.HOLY_KNIGHTS }

      await expect(forumService.createPost('user-1', input)).rejects.toThrow(TRPCError)
      expect(mockForumRepo.createPost).not.toHaveBeenCalled()
    })
  })

  describe('createReply', () => {
    it('should create a reply inheriting parent faction and depth', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })
      const parent = mockForumComment({ id: 'parent-1', rootId: 'root-1', depth: 2, faction: Faction.HOLY_KNIGHTS })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(parent)
      const input = { parentId: 'parent-1', content: 'Reply content' }
      const reply = mockForumComment({ id: 'reply-1', parentId: 'parent-1', depth: 3 })
      mockForumRepo.createReply.mockResolvedValue(reply)

      const result = await forumService.createReply('user-1', input)

      expect(result).toEqual(reply)
      expect(mockForumRepo.createReply).toHaveBeenCalledWith(
        'char-123',
        input,
        Faction.HOLY_KNIGHTS,
        2,
        'root-1'
      )
    })

    it('should throw when user replies in a different faction', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.LEGION
      })
      const parent = mockForumComment({ id: 'parent-1', rootId: 'root-1', depth: 0, faction: Faction.HOLY_KNIGHTS })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(parent)
      const input = { parentId: 'parent-1', content: 'Reply content' }

      await expect(forumService.createReply('user-1', input)).rejects.toThrow(TRPCError)
      expect(mockForumRepo.createReply).not.toHaveBeenCalled()
    })
  })

  describe('updateComment', () => {
    it('should update when user owns the comment', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({ id: 'char-123' })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(mockForumComment({ authorId: 'char-123' }))
      const input = { id: 'comment-1', content: 'Updated' }
      const updated = mockForumComment({ content: 'Updated' })
      mockForumRepo.update.mockResolvedValue(updated)

      const result = await forumService.updateComment('user-1', 'comment-1', input)

      expect(result).toEqual(updated)
    })

    it('should update with title when provided', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({ id: 'char-123' })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(mockForumComment({ authorId: 'char-123' }))
      const input = { id: 'comment-1', title: 'New Title', content: 'Updated' }
      const updated = mockForumComment({ title: 'New Title', content: 'Updated' })
      mockForumRepo.update.mockResolvedValue(updated)

      const result = await forumService.updateComment('user-1', 'comment-1', input)

      expect(result).toEqual(updated)
      expect(mockForumRepo.update).toHaveBeenCalledWith('comment-1', input)
    })

    it('should throw when user does not own the comment', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({ id: 'char-456' })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(mockForumComment({ authorId: 'char-123' }))

      await expect(
        forumService.updateComment('user-1', 'comment-1', { id: 'comment-1', content: 'Updated' })
      ).rejects.toThrow(TRPCError)
      expect(mockForumRepo.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteComment', () => {
    it('should soft-delete when user owns a root post', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({ id: 'char-123' })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(mockForumComment({ authorId: 'char-123', parentId: null }))
      mockForumRepo.softDeletePost.mockResolvedValue(mockForumComment({ title: '[deleted]', content: '[deleted]' }))

      await forumService.deleteComment('user-1', 'comment-1')

      expect(mockForumRepo.softDeletePost).toHaveBeenCalledWith('comment-1')
      expect(mockForumRepo.delete).not.toHaveBeenCalled()
    })

    it('should hard-delete when user owns a reply', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({ id: 'char-123' })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(mockForumComment({ authorId: 'char-123', parentId: 'parent-1' }))
      mockForumRepo.delete.mockResolvedValue(mockForumComment())

      await forumService.deleteComment('user-1', 'comment-1')

      expect(mockForumRepo.delete).toHaveBeenCalledWith('comment-1')
      expect(mockForumRepo.softDeletePost).not.toHaveBeenCalled()
    })

    it('should throw when user does not own the comment', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({ id: 'char-456' })
      mockForumRepo.findByIdOrThrow.mockResolvedValue(mockForumComment({ authorId: 'char-123' }))

      await expect(forumService.deleteComment('user-1', 'comment-1')).rejects.toThrow(TRPCError)
      expect(mockForumRepo.delete).not.toHaveBeenCalled()
      expect(mockForumRepo.softDeletePost).not.toHaveBeenCalled()
    })
  })

  describe('buildTree', () => {
    it('should build a tree from flat descendants', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })
      const root = mockForumComment({ id: 'root' })
      const child1 = mockForumComment({ id: 'child-1', parentId: 'root', depth: 1, title: null })
      const child2 = mockForumComment({ id: 'child-2', parentId: 'root', depth: 1, title: null })
      const grandchild = mockForumComment({ id: 'grandchild-1', parentId: 'child-1', depth: 2, title: null })

      mockForumRepo.findByIdOrThrow.mockResolvedValue(root)
      mockForumRepo.findPostWithAllDescendants.mockResolvedValue({
        root,
        descendants: [child1, child2, grandchild],
        hasMore: false
      })

      const result = await forumService.getPostWithReplies('user-1', 'root')

      expect(result.id).toBe('root')
      expect(result.children).toHaveLength(2)
      expect(result.children[0].id).toBe('child-1')
      expect(result.children[0].children).toHaveLength(1)
      expect(result.children[0].children[0].id).toBe('grandchild-1')
      expect(result.children[1].id).toBe('child-2')
      expect(result.children[1].children).toHaveLength(0)
    })

    it('should return root with empty children when no descendants', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })
      const root = mockForumComment({ id: 'root' })

      mockForumRepo.findByIdOrThrow.mockResolvedValue(root)
      mockForumRepo.findPostWithAllDescendants.mockResolvedValue({
        root,
        descendants: [],
        hasMore: false
      })

      const result = await forumService.getPostWithReplies('user-1', 'root')

      expect(result.id).toBe('root')
      expect(result.children).toHaveLength(0)
    })

    it('should discard orphan descendants not connected to root', async () => {
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue({
        id: 'char-123',
        factionName: Faction.HOLY_KNIGHTS
      })
      const root = mockForumComment({ id: 'root' })
      const child = mockForumComment({ id: 'child-1', parentId: 'root', depth: 1 })
      const orphan = mockForumComment({ id: 'orphan', parentId: 'nonexistent', depth: 1 })

      mockForumRepo.findByIdOrThrow.mockResolvedValue(root)
      mockForumRepo.findPostWithAllDescendants.mockResolvedValue({
        root,
        descendants: [child, orphan],
        hasMore: false
      })

      const result = await forumService.getPostWithReplies('user-1', 'root')

      expect(result.children).toHaveLength(1)
      expect(result.children[0].id).toBe('child-1')
    })
  })
})
