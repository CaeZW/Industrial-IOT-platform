import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AdministrationController, EquipmentSettingsController } from './administration.controller.js';
import { AdministrationRepository } from './administration.repository.js';
import { PrismaAdministrationRepository } from './prisma-administration.repository.js';
import { AdministrationService } from './administration.service.js';
import { AdministratorGuard } from './administrator.guard.js';

@Module({
  imports: [UsersModule],
  controllers: [AdministrationController, EquipmentSettingsController],
  providers: [AdministrationService, AdministratorGuard,
    { provide: AdministrationRepository, useClass: PrismaAdministrationRepository }],
})
export class AdministrationModule {}
