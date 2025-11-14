import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { Op } from 'sequelize';
import { AMLAlert, AlertStatus, ResolutionType } from '../../models/aml-alert.model';
import { User } from '../../models/user.model';
import { Transaction } from '../../models/transaction.model';
import { ListAMLAlertsDto, ReviewAMLAlertDto, ResolveAMLAlertDto } from './dtos/aml-alert.dto';

@Injectable()
export class AMLAlertsService {
  private readonly logger = new Logger(AMLAlertsService.name);

  constructor(
    private readonly i18n: I18nService,
    @InjectModel(AMLAlert)
    private amlAlertModel: typeof AMLAlert,
  ) {}

  async listAlerts(dto: ListAMLAlertsDto) {
    const { page = 1, limit = 20, status, severity, alert_type, user_id, start_date, end_date } = dto;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (alert_type) where.alert_type = alert_type;
    if (user_id) where.user_id = user_id;

    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date);
      if (end_date) where.created_at[Op.lte] = new Date(end_date);
    }

    const { rows: alerts, count: total } = await this.amlAlertModel.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: User, as: 'user', attributes: ['id', 'user_name', 'user_email', 'user_DNI_number'] },
        { model: Transaction, as: 'transaction', attributes: ['id', 'amount', 'type', 'status'] },
        { model: User, as: 'reviewer', attributes: ['id', 'user_name'], required: false },
        { model: User, as: 'resolver', attributes: ['id', 'user_name'], required: false },
      ],
      order: [['created_at', 'DESC']],
    });

    return {
      data: alerts,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getAlertById(id: string) {
    const alert = await this.amlAlertModel.findByPk(id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'user_name', 'user_email', 'user_DNI_number', 'user_phone_number'] },
        { model: Transaction, as: 'transaction' },
        { model: User, as: 'reviewer', attributes: ['id', 'user_name'], required: false },
        { model: User, as: 'resolver', attributes: ['id', 'user_name'], required: false },
      ],
    });

    if (!alert) {
      throw new NotFoundException(
        this.getTranslatedMessage('aml.alert_not_found'),
      );
    }

    return alert;
  }

  async reviewAlert(id: string, userId: string, dto: ReviewAMLAlertDto) {
    const alert = await this.amlAlertModel.findOne({
      where: { id },
      raw: false,
    });

    if (!alert) {
      throw new NotFoundException(
        this.getTranslatedMessage('aml.alert_not_found'),
      );
    }

    // Get raw data to debug
    const rawAlert = alert.get({ plain: true }) as any;
    
    if (!rawAlert.status || rawAlert.status !== 'pending') {
      throw new BadRequestException(
        `Cannot review alert with status: ${rawAlert.status}. Only pending alerts can be reviewed.`,
      );
    }

    alert.status = AlertStatus.UNDER_REVIEW;
    alert.reviewed_at = new Date();
    alert.reviewed_by = userId;
    alert.review_notes = dto.review_notes;

    await alert.save();

    return {
      message: this.getTranslatedMessage('aml.status_updated'),
      alert,
    };
  }

  async resolveAlert(id: string, userId: string, dto: ResolveAMLAlertDto) {
    const alert = await this.amlAlertModel.findByPk(id);

    if (!alert) {
      throw new NotFoundException(
        this.getTranslatedMessage('aml.alert_not_found'),
      );
    }

    if (alert.status === AlertStatus.RESOLVED) {
      throw new BadRequestException(
        this.getTranslatedMessage('aml.alert_not_found'),
      );
    }

    // Update resolution details
    if (dto.resolution_type === ResolutionType.FALSE_POSITIVE) {
      alert.status = AlertStatus.FALSE_POSITIVE;
    } else if (dto.escalate) {
      alert.status = AlertStatus.ESCALATED;
      alert.is_escalated = true;
      alert.escalated_at = new Date();
    } else {
      alert.status = AlertStatus.RESOLVED;
    }

    alert.resolved_at = new Date();
    alert.resolved_by = userId;
    alert.resolution_type = dto.resolution_type;
    alert.resolution_notes = dto.resolution_notes;

    if (dto.external_reference) {
      alert.external_reference = dto.external_reference;
    }

    await alert.save();

    return {
      message: this.getTranslatedMessage('aml.status_updated'),
      alert,
    };
  }

  private getTranslatedMessage(
    key: string,
    lang: string = 'en',
    params?: any,
  ): string {
    try {
      return this.i18n.t(`messages.${key}`, { lang, args: params });
    } catch (error) {
      this.logger.warn(`Translation not found for key: ${key}, lang: ${lang}`);
      return key;
    }
  }

  async getAlertStats() {
    const [
      total,
      pending,
      under_review,
      resolved,
      false_positive,
      escalated,
      by_severity,
      by_type,
    ] = await Promise.all([
      this.amlAlertModel.count(),
      this.amlAlertModel.count({ where: { status: AlertStatus.PENDING } }),
      this.amlAlertModel.count({ where: { status: AlertStatus.UNDER_REVIEW } }),
      this.amlAlertModel.count({ where: { status: AlertStatus.RESOLVED } }),
      this.amlAlertModel.count({ where: { status: AlertStatus.FALSE_POSITIVE } }),
      this.amlAlertModel.count({ where: { status: AlertStatus.ESCALATED } }),
      this.amlAlertModel.findAll({
        attributes: [
          'severity',
          [this.amlAlertModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['severity'],
        raw: true,
      }),
      this.amlAlertModel.findAll({
        attributes: [
          'alert_type',
          [this.amlAlertModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['alert_type'],
        raw: true,
      }),
    ]);

    return {
      total,
      by_status: {
        pending,
        under_review,
        resolved,
        false_positive,
        escalated,
      },
      by_severity,
      by_type,
    };
  }
}

