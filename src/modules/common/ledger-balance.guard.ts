import { BadRequestException } from '@nestjs/common';
import { Ledger, LedgerEntryType } from '../../models/ledger.model';

export async function assertLedgerBalanced(transactionId: string) {
  const entries = await Ledger.findAll({
    where: { transaction_id: transactionId },
  });
  const sum = entries.reduce(
    (acc, e) =>
      acc +
      (e.entry_type === LedgerEntryType.DEBIT ? 1 : -1) *
        parseFloat(e.amount as unknown as string),
    0,
  );
  if (Math.abs(sum) > 0.009) {
    throw new BadRequestException('unbalanced_ledger_for_transaction');
  }
}
