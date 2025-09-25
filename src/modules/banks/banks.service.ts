import { Injectable } from '@nestjs/common';
import { BankLocation } from '../../models/bank-location.model';

@Injectable()
export class BanksService {
  async listNearby(limit = 20) {
    // Placeholder: DB only, no geodistance calculation here
    return BankLocation.findAll({
      where: { is_active: true },
      order: [
        ['city', 'ASC'],
        ['bank_name', 'ASC'],
      ],
      limit,
      attributes: [
        'id',
        'bank_name',
        'branch_name',
        'address',
        'city',
        'state',
        'country',
        'latitude',
        'longitude',
        'phone',
      ],
    });
  }
}
