import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt.guard';
import type { RequestContext } from '../common/auth-context';
import { CurrentUser } from '../common/current-user.decorator';

import { GroupsRepository, type GroupRow } from './groups.repository';

const CreateSchema = z.object({ tripId: z.string().uuid(), name: z.string().min(1).max(80) });
const JoinSchema = z.object({ code: z.string().min(4).max(16), bikeId: z.string().uuid().optional() });

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsRepository) {}

  @Post()
  create(@CurrentUser() ctx: RequestContext, @Body() body: unknown): Promise<GroupRow> {
    const input = CreateSchema.parse(body);
    return this.groups.createGroup(ctx, input.tripId, input.name);
  }

  @Post('join')
  join(@CurrentUser() ctx: RequestContext, @Body() body: unknown): Promise<GroupRow> {
    const input = JoinSchema.parse(body);
    return this.groups.joinByCode(ctx, input.code, input.bikeId);
  }
}
