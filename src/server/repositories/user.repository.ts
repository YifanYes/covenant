import { Prisma, type PrismaClient, type User, type UserSettings } from '@/generated/prisma'
import type { TutorialSlideId } from '@shared/schemas/onboarding.schemas'

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

  async update(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data
    })
  }

  async setTutorialSlidesSeen(userId: string, slideIds: TutorialSlideId[]): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { tutorialSlidesSeen: slideIds }
    })
  }

  async getTutorialSlidesSeen(userId: string): Promise<TutorialSlideId[]> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tutorialSlidesSeen: true }
    })
    return ((row?.tutorialSlidesSeen as unknown as TutorialSlideId[]) ?? []) as TutorialSlideId[]
  }
}
