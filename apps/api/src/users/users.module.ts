import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { PrismaUsersRepository } from './prisma-users.repository.js';

@Module({
  providers: [UsersService, { provide: UsersRepository, useClass: PrismaUsersRepository }],
  exports: [UsersService],
})
export class UsersModule {}

