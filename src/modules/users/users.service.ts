import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../../models/user.model';

export interface SafeUser {
  id: string;
  user_email?: string;
  user_name: string;
  user_phone_number?: string;
  user_DNI_number: string;
  user_first_name: string;
  user_last_name: string;
  user_status: string;
  user_role: string;
  frontIdFileUrl?: string;
  backIdFileUrl?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async findById(id: string): Promise<User | null> {
    return await (this.userModel as any).findOne({
      where: { id: id },
    });
  }

  async findAll(): Promise<User[]> {
    return await (this.userModel as any).findAll({
      order: [['createdAt', 'DESC']],
    });
  }

  sanitizeUser(user: User): SafeUser {
    return {
      id: user.id,
      user_email: user.user_email,
      user_name: user.user_name,
      user_phone_number: user.user_phone_number,
      user_DNI_number: user.user_DNI_number,
      user_first_name: user.user_first_name,
      user_last_name: user.user_last_name,
      user_status: user.user_status,
      user_role: user.user_role,
      frontIdFileUrl: user.frontIdFileUrl,
      backIdFileUrl: user.backIdFileUrl,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
