import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AreaRepository } from '../../repositories/area.repository'
import { AreaService } from '../../services/area.service'
import { createRepoMock } from '../helpers/mock-repo'

describe('AreaService', () => {
  let areaService: AreaService
  let mockAreaRepo: ReturnType<typeof createRepoMock<AreaRepository>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockAreaRepo = createRepoMock<AreaRepository>()

    areaService = new AreaService(mockAreaRepo)
  })

  it('create passes userId and input to repo', async () => {
    const input = { name: 'Health', color: '#FF0000', icon: 'heart' }
    mockAreaRepo.create.mockResolvedValue({ id: BigInt(1), publicId: 'abc123abcabc', ...input })

    const result = await areaService.create('user-1', input)

    expect(mockAreaRepo.create).toHaveBeenCalledWith('user-1', input)
    expect(result.area).toEqual({ publicId: 'abc123abcabc', name: 'Health', color: '#FF0000', icon: 'heart' })
  })

  it('getAll returns wrapped areas with publicId only', async () => {
    mockAreaRepo.findAll.mockResolvedValue([
      { id: BigInt(1), publicId: 'aaaaaaaaaaaa', name: 'A', color: null, icon: null },
      { id: BigInt(2), publicId: 'bbbbbbbbbbbb', name: 'B', color: null, icon: null }
    ])
    const { areas } = await areaService.getAll('user-1')
    expect(areas).toHaveLength(2)
    expect(areas[0]).not.toHaveProperty('id')
    expect(areas[0].publicId).toBe('aaaaaaaaaaaa')
    expect(mockAreaRepo.findAll).toHaveBeenCalledWith('user-1')
  })

  it('update resolves publicId to bigint then calls repo.update', async () => {
    const input = { publicId: 'pubid1234567', name: 'Renamed' }
    mockAreaRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: 'pubid1234567', name: 'Old' })
    mockAreaRepo.update.mockResolvedValue({ id: BigInt(1), publicId: 'pubid1234567', name: 'Renamed', color: null, icon: null })

    const result = await areaService.update('user-1', input)

    expect(mockAreaRepo.findByPublicId).toHaveBeenCalledWith('pubid1234567', 'user-1')
    expect(mockAreaRepo.update).toHaveBeenCalledWith(BigInt(1), 'user-1', input)
    expect(result.area.publicId).toBe('pubid1234567')
    expect(result.area).not.toHaveProperty('id')
  })

  it('update throws NOT_FOUND if publicId resolves nothing', async () => {
    mockAreaRepo.findByPublicId.mockResolvedValue(null)
    await expect(
      areaService.update('user-1', { publicId: 'missingxxxxx', name: 'X' })
    ).rejects.toThrow()
  })

  it('delete resolves publicId then calls repo.delete', async () => {
    mockAreaRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: 'pubid1234567' })
    const result = await areaService.delete('user-1', 'pubid1234567')
    expect(mockAreaRepo.findByPublicId).toHaveBeenCalledWith('pubid1234567', 'user-1')
    expect(mockAreaRepo.delete).toHaveBeenCalledWith(BigInt(1), 'user-1')
    expect(result.message).toBe('Area deleted successfully')
  })

  it('delete throws NOT_FOUND if publicId resolves nothing', async () => {
    mockAreaRepo.findByPublicId.mockResolvedValue(null)
    await expect(areaService.delete('user-1', 'missingxxxxx')).rejects.toThrow()
  })
})
