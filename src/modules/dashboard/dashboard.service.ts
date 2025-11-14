import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Transaction } from '../../models/transaction.model';
import { User } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import { AMLAlert } from '../../models/aml-alert.model';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Transaction) private transactionModel: typeof Transaction,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Wallet) private walletModel: typeof Wallet,
    @InjectModel(AMLAlert) private amlAlertModel: typeof AMLAlert,
  ) {}

  async getMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      todayTransactions,
      last30DaysTransactions,
      pendingTransactions,
      totalVolume,
      walletBalances,
      pendingAMLAlerts,
    ] = await Promise.all([
      this.userModel.count(),
      this.userModel.count({ where: { user_status: 'active' } }),
      this.transactionModel.count(),
      this.transactionModel.count({
        where: { created_at: { [Op.gte]: today } } as any,
      }),
      this.transactionModel.count({
        where: { created_at: { [Op.gte]: last30Days } } as any,
      }),
      this.transactionModel.count({ where: { status: 'pending' } }),
      this.transactionModel.findOne({
        attributes: [
          [this.transactionModel.sequelize!.fn('SUM', this.transactionModel.sequelize!.col('amount')), 'total'],
        ],
        raw: true,
      }) as any,
      this.walletModel.findAll({
        attributes: [
          'currency',
          [this.walletModel.sequelize!.fn('SUM', this.walletModel.sequelize!.col('available_balance')), 'total'],
        ],
        group: ['currency'],
        raw: true,
      }),
      this.amlAlertModel.count({ where: { status: 'pending' } }),
    ]);

    const avgTransactionValue =
      totalTransactions > 0 ? parseFloat(totalVolume?.total || '0') / totalTransactions : 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        growth_rate: '5.2%', // Placeholder - calculate from historical data
      },
      transactions: {
        total: totalTransactions,
        today: todayTransactions,
        last_30_days: last30DaysTransactions,
        pending: pendingTransactions,
        average_value: avgTransactionValue.toFixed(2),
      },
      volume: {
        total: parseFloat(totalVolume?.total || '0').toFixed(2),
        by_currency: walletBalances,
      },
      alerts: {
        pending_aml_alerts: pendingAMLAlerts,
      },
      generated_at: new Date(),
    };
  }

  async getSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      todayTransactions,
      totalVolume,
      pendingAMLAlerts,
      openDisputes,
    ] = await Promise.all([
      this.userModel.count(),
      this.userModel.count({ where: { user_status: 'active' } }),
      this.transactionModel.count(),
      this.transactionModel.count({
        where: { created_at: { [Op.gte]: today } } as any,
      }),
      this.transactionModel.findOne({
        attributes: [
          [this.transactionModel.sequelize!.fn('SUM', this.transactionModel.sequelize!.col('amount')), 'total'],
        ],
        raw: true,
      }) as any,
      this.amlAlertModel.count({ where: { status: 'pending' } }),
      // Count open disputes if dispute model is available
      Promise.resolve(0), // Placeholder
    ]);

    return {
      total_users: totalUsers,
      active_users: activeUsers,
      transaction_volume: parseFloat(totalVolume?.total || '0').toFixed(2),
      transactions_count: totalTransactions,
      today_transactions: todayTransactions,
      open_alerts: pendingAMLAlerts,
      open_disputes: openDisputes,
      generated_at: new Date(),
    };
  }

  async getTopUsers(
    limit: number = 10,
    sortBy: 'volume' | 'activity' = 'volume',
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ) {
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    if (sortBy === 'volume') {
      // Get users sorted by transaction volume
      const topUsersByVolume = await this.transactionModel.findAll({
        attributes: [
          'sender_user_id',
          [this.transactionModel.sequelize!.fn('SUM', this.transactionModel.sequelize!.col('amount')), 'total_volume'],
          [this.transactionModel.sequelize!.fn('COUNT', this.transactionModel.sequelize!.col('id')), 'transaction_count'],
        ],
        where: {
          created_at: { [Op.gte]: startDate },
          sender_user_id: { [Op.ne]: null },
        } as any,
        group: ['sender_user_id'],
        order: [[this.transactionModel.sequelize!.literal('total_volume'), 'DESC']],
        limit: Math.min(limit, 50),
        raw: true,
      }) as any[];

      // Get user details
      const userIds = topUsersByVolume.map((u) => u.sender_user_id);
      const users = await this.userModel.findAll({
        where: { id: userIds },
        attributes: ['id', 'user_name', 'user_first_name', 'user_last_name', 'user_email', 'user_status'],
      });

      const usersMap = new Map(users.map((u) => [u.id, u]));

      return {
        period,
        sort_by: sortBy,
        users: topUsersByVolume.map((u) => {
          const user = usersMap.get(u.sender_user_id);
          return {
            user_id: u.sender_user_id,
            user_name: user?.user_name || 'Unknown',
            full_name: user ? `${user.user_first_name} ${user.user_last_name}`.trim() : 'Unknown',
            total_volume: parseFloat(u.total_volume || '0').toFixed(2),
            transaction_count: parseInt(u.transaction_count || '0'),
            status: user?.user_status || 'unknown',
          };
        }),
        generated_at: new Date(),
      };
    } else {
      // Get users sorted by activity (transaction count)
      const topUsersByActivity = await this.transactionModel.findAll({
        attributes: [
          'sender_user_id',
          [this.transactionModel.sequelize!.fn('COUNT', this.transactionModel.sequelize!.col('id')), 'transaction_count'],
          [this.transactionModel.sequelize!.fn('SUM', this.transactionModel.sequelize!.col('amount')), 'total_volume'],
        ],
        where: {
          created_at: { [Op.gte]: startDate },
          sender_user_id: { [Op.ne]: null },
        } as any,
        group: ['sender_user_id'],
        order: [[this.transactionModel.sequelize!.literal('transaction_count'), 'DESC']],
        limit: Math.min(limit, 50),
        raw: true,
      }) as any[];

      // Get user details
      const userIds = topUsersByActivity.map((u) => u.sender_user_id);
      const users = await this.userModel.findAll({
        where: { id: userIds },
        attributes: ['id', 'user_name', 'user_first_name', 'user_last_name', 'user_email', 'user_status'],
      });

      const usersMap = new Map(users.map((u) => [u.id, u]));

      return {
        period,
        sort_by: sortBy,
        users: topUsersByActivity.map((u) => {
          const user = usersMap.get(u.sender_user_id);
          return {
            user_id: u.sender_user_id,
            user_name: user?.user_name || 'Unknown',
            full_name: user ? `${user.user_first_name} ${user.user_last_name}`.trim() : 'Unknown',
            transaction_count: parseInt(u.transaction_count || '0'),
            total_volume: parseFloat(u.total_volume || '0').toFixed(2),
            status: user?.user_status || 'unknown',
          };
        }),
        generated_at: new Date(),
      };
    }
  }

  async getAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pendingAMLAlerts,
      criticalAMLAlerts,
      todayAlerts,
      recentTransactionFailures,
      suspendedUsers,
    ] = await Promise.all([
      this.amlAlertModel.findAll({
        where: { status: 'pending' },
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [{ model: User, as: 'user', attributes: ['id', 'user_name'] }],
      }),
      this.amlAlertModel.count({
        where: { status: 'pending', severity: 'critical' },
      }),
      this.amlAlertModel.count({
        where: { created_at: { [Op.gte]: today } },
      }),
      this.transactionModel.count({
        where: {
          status: 'failed',
          created_at: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        } as any,
      }),
      this.userModel.count({ where: { user_status: 'suspended' } }),
    ]);

    return {
      summary: {
        pending_aml_alerts: pendingAMLAlerts.length,
        critical_aml_alerts: criticalAMLAlerts,
        today_alerts: todayAlerts,
        recent_failures: recentTransactionFailures,
        suspended_users: suspendedUsers,
      },
      recent_aml_alerts: pendingAMLAlerts,
      generated_at: new Date(),
    };
  }
}

