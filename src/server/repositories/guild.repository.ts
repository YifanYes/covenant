import type { Guild, PrismaClient } from '@/generated/prisma'

export class GuildRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Guild | null> {
    return this.prisma.guild.findUnique({ where: { id } })
  }

  async create(data: { name: string; description?: string; ownerId: string; factionName: string }): Promise<Guild> {
    return this.prisma.guild.create({ data })
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<Guild> {
    return this.prisma.guild.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.guild.delete({ where: { id } })
  }
}
