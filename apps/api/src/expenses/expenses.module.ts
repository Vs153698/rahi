import { Module } from '@nestjs/common';

import { ExpensesRepository } from './repositories/expenses.repository';

@Module({
  providers: [ExpensesRepository],
  exports: [ExpensesRepository],
})
export class ExpensesModule {}
