import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { GroupsController } from './groups.controller';
import { GroupsRepository } from './groups.repository';

@Module({
  imports: [AuthModule],
  controllers: [GroupsController],
  providers: [GroupsRepository],
  exports: [GroupsRepository],
})
export class GroupsModule {}
