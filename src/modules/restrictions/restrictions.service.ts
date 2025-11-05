import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { Restriction, RestrictionType } from '../../models/restriction.model';

@Injectable()
export class RestrictionsService {
  private readonly logger = new Logger(RestrictionsService.name);

  constructor(
    private readonly i18n: I18nService,
    @InjectModel(Restriction)
    private restrictionModel: typeof Restriction,
  ) {}

  async createRestriction(
    userId: string,
    type: RestrictionType,
    value: string,
    adminId: string,
    description?: string,
    latitude?: number,
    longitude?: number,
    radiusKm?: number,
  ) {
    return this.restrictionModel.create({
      user_id: userId,
      restriction_type: type,
      restriction_value: value,
      latitude: latitude || null,
      longitude: longitude || null,
      radius_km: radiusKm || null,
      description: description || null,
      created_by: adminId,
    } as any);
  }

  async validateRestriction(
    userId: string,
    userLatitude?: number,
    userLongitude?: number,
    deviceId?: string,
    ipAddress?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const restrictions = await this.restrictionModel.findAll({
      where: { user_id: userId, is_active: true },
    });

    if (restrictions.length === 0) return { allowed: true };

    for (const r of restrictions) {
      if (r.restriction_type === RestrictionType.GEOFENCE) {
        if (!userLatitude || !userLongitude) {
          return { allowed: false, reason: 'Location required for geofence check' };
        }
        const distance = this.calculateDistance(
          userLatitude,
          userLongitude,
          parseFloat(r.latitude as any),
          parseFloat(r.longitude as any),
        );
        if (distance > (r.radius_km || 0)) {
          return { allowed: false, reason: `Outside allowed geofence (${distance.toFixed(2)}km away)` };
        }
      } else if (r.restriction_type === RestrictionType.DEVICE && deviceId) {
        if (r.restriction_value !== deviceId) {
          return { allowed: false, reason: 'Device not in allowed list' };
        }
      } else if (r.restriction_type === RestrictionType.IP_ADDRESS && ipAddress) {
        if (r.restriction_value !== ipAddress) {
          return { allowed: false, reason: 'IP address not in allowed list' };
        }
      }
    }

    return { allowed: true };
  }

  async listRestrictions(userId: string) {
    return this.restrictionModel.findAll({ where: { user_id: userId } });
  }

  async toggleRestriction(restrictionId: string, isActive: boolean) {
    const restriction = await this.restrictionModel.findByPk(restrictionId);
    if (!restriction)
      throw new BadRequestException(
        this.getTranslatedMessage('restrictions.restrictions_retrieved'),
      );
    restriction.is_active = isActive;
    return restriction.save();
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

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
