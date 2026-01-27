import type { PrismaClient, User } from '../generated/prisma'

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId }
    })
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId }
    })
  }
}
