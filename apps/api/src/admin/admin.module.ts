import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { AdminController } from './admin.controller';
import { ModerationRepository } from './moderation.repository';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [ModerationRepository],
})
export class AdminModule {}
