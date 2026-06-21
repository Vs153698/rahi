import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { RecapController } from './recap.controller';
import { RecapRepository } from './recap.repository';

@Module({
  imports: [AuthModule],
  controllers: [RecapController],
  providers: [RecapRepository],
})
export class RecapModule {}
