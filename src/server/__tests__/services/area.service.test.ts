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
    mockAreaRepo.create.mockResolvedValue({ id: 'a-1', ...input })

    const result = await areaService.create('user-1', input)

    expect(mockAreaRepo.create).toHaveBeenCalledWith('user-1', input)
    expect(result.area).toEqual({ id: 'a-1', ...input })
  })

  it('getAll returns wrapped areas', async () => {
    mockAreaRepo.findAll.mockResolvedValue([{ id: 'a-1' }, { id: 'a-2' }])
    const { areas } = await areaService.getAll('user-1')
    expect(areas).toHaveLength(2)
    expect(mockAreaRepo.findAll).toHaveBeenCalledWith('user-1')
  })

  it('update passes id, userId, input to repo', async () => {
    const input = { id: 'a-1', name: 'Renamed' }
    mockAreaRepo.update.mockResolvedValue({ id: 'a-1', name: 'Renamed' })

    const result = await areaService.update('user-1', input)

    expect(mockAreaRepo.update).toHaveBeenCalledWith('a-1', 'user-1', input)
    expect(result.area).toEqual({ id: 'a-1', name: 'Renamed' })
  })

  it('delete passes id and userId, returns success message', async () => {
    const result = await areaService.delete('user-1', 'a-1')
    expect(mockAreaRepo.delete).toHaveBeenCalledWith('a-1', 'user-1')
    expect(result.message).toBe('Area deleted successfully')
  })
})
