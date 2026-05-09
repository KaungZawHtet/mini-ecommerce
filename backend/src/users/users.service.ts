import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  incrementFailedLoginAttempts(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
      },
    });
  }

  setLoginLockout(userId: string, lockedUntil: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil,
      },
    });
  }

  resetFailedLoginAttempts(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }
}
