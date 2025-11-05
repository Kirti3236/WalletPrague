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

