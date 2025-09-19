import { User } from '../../../models/user.model';

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: SafeUser;
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

export interface SafeUser {
  id: string;
  user_email: string;
  user_name: string;
  user_phone_number?: string;
  user_DNI_number?: string;
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

export interface StandardResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface JwtPayload {
  sub: string; // user id
  user_email: string;
  user_role: string;
  iat?: number;
  exp?: number;
}
