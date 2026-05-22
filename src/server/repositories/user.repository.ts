import type { PrismaClient, User, UserSettings } from '@/generated/prisma'

export type UserWithSettings = User & { userSettings: UserSettings | null }

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(userId: string): Promise<UserWithSettings | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { userSettings: true }
    })
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId }
    })
  }

  async update(userId: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data
    })
  }

  async setTutorialCompletedAt(userId: string, value: Date | null): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { tutorialCompletedAt: value }
    })
  }
}
