import { Injectable } from '@nestjs/common';
import { Wallet } from '../../models/wallet.model';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Op } from 'sequelize';

@Injectable()
export class WalletsService {
  async getWalletByUser(userId: string, currency = 'LPS') {
    return (Wallet as any).findOne({
      where: { user_id: userId, currency },
      attributes: ['id', 'wallet_name', 'currency', 'available_balance', 'ledger_balance', 'status', 'updated_at'],
      include: [
        {
          model: User,
          attributes: ['id', 'user_first_name', 'user_last_name', 'user_name', 'user_email', 'user_phone_number', 'user_DNI_number', 'user_status'],
          as: 'user'
        }
      ]
    });
  }

  async getRecentTransactions(userId: string, limit = 10) {
    return (Transaction as any).findAll({
      where: {
        [Op.or]: [{ sender_user_id: userId }, { receiver_user_id: userId }],
      },
      order: [['created_at', 'DESC']],
      limit,
      attributes: ['id', 'type', 'status', 'amount', 'currency', 'description', 'created_at'],
    });
  }
}
