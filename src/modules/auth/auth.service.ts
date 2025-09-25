import { Injectable, Logger } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { randomUUID } from 'crypto';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { User, UserStatus } from '../../models/user.model';
import { Wallet } from '../../models/wallet.model';
import {
  AuthResponse,
  StandardResponse,
  SafeUser,
  JwtPayload,
} from './interfaces/auth-response.interface';
import { UsernameGeneratorUtil } from '../../common/utils/username-generator.util';
import { ResponseService } from '../../common/services/response.service';
import { StatusCode } from '../../common/constants/status-codes';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(User)
    private userModel: typeof User,
    private usernameGenerator: UsernameGeneratorUtil,
    private responseService: ResponseService,
    private i18n: I18nService,
  ) {}

  async register(
    body: any,
    files?: any,
    lang: string = 'en',
  ): Promise<AuthResponse> {
    const {
      user_email,
      user_password,
      confirm_password,
      user_first_name,
      user_last_name,
      user_phone_number,
      user_DNI_number,
    } = body;

    // Joi validation handles all field validation, so no manual validation needed here

    // Check if user already exists by DNI number (primary identifier for login)
    const existingUser = await (this.userModel as any).findOne({
      where: { user_DNI_number },
    });

    if (existingUser) {
      return {
        success: false,
        message: this.getTranslatedMessage(
          'validation.document_already_exists',
          lang,
        ),
        data: null,
      } as any;
    }

    // Generate unique username (with limited retries on race conditions)
    let user_name = await this.usernameGenerator.generateUniqueUsername();

    // Handle file uploads and construct URLs
    const frontIdFileUrl = files?.frontIdFile?.[0]?.filename
      ? `${this.configService.get('app.baseUrl')}/uploads/documents/${files.frontIdFile[0].filename}`
      : null;
    const backIdFileUrl = files?.backIdFile?.[0]?.filename
      ? `${this.configService.get('app.baseUrl')}/uploads/documents/${files.backIdFile[0].filename}`
      : null;

    // Create new user with retry for username uniqueness
    let savedUser: User | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        savedUser = await (this.userModel as any).create({
          user_email,
          user_name,
          user_password,
          user_first_name,
          user_last_name,
          user_phone_number,
          user_DNI_number,
          frontIdFileUrl,
          backIdFileUrl,
        } as any);
        break;
      } catch (err: any) {
        // Handle unique violations gracefully
        const isUnique =
          err?.name?.includes('UniqueConstraint') ||
          err?.name?.includes('SequelizeUniqueConstraintError');
        if (isUnique) {
          const path = err?.errors?.[0]?.path || '';
          if (path.includes('user_name')) {
            // regenerate username and retry
            user_name = await this.usernameGenerator.generateUniqueUsername();
            continue;
          }
          if (path.includes('user_DNI_number')) {
            return {
              success: false,
              message: this.getTranslatedMessage(
                'validation.document_already_exists',
                lang,
              ),
              data: null,
            } as any;
          }
          if (path.includes('user_email')) {
            return {
              success: false,
              message: this.getTranslatedMessage(
                'validation.email_already_exists',
                lang,
              ),
              data: null,
            } as any;
          }
          if (path.includes('user_phone_number')) {
            return {
              success: false,
              message: this.getTranslatedMessage(
                'validation.phone_already_exists',
                lang,
              ),
              data: null,
            } as any;
          }
        }
        // Unknown error → log and rethrow to be handled by global filter
        this.logger.error(`Register failed: ${err?.message || err}`);
        throw err;
      }
    }
    if (!savedUser) {
      return {
        success: false,
        message: this.getTranslatedMessage(
          'validation.required_fields_missing',
          lang,
        ),
        data: null,
      } as any;
    }

    // Ensure user has a default wallet for LPS currency
    try {
      const existingWallet = await (Wallet as any).findOne({
        where: { user_id: savedUser.id, currency: 'LPS' },
      });
      if (!existingWallet) {
        await (Wallet as any).create({
          user_id: savedUser.id,
          wallet_name: 'Primary LPS',
          currency: 'LPS',
          available_balance: '0.00',
          ledger_balance: '0.00',
          reserved_balance: '0.00',
          status: 'active',
        });
      }
    } catch (e) {
      this.logger.warn(
        `Auto wallet create skipped: ${e instanceof Error ? e.message : e}`,
      );
    }

    // Generate access token
    const accessToken = await this.generateAccessToken(savedUser);

    return {
      success: true,
      message: this.getTranslatedMessage('auth.registration_success', lang),
      data: {
        user: this.sanitizeUser(savedUser),
        accessToken,
        expiresIn: this.getTokenExpirationTime(),
        tokenType: 'Bearer',
      },
    };
  }

  async login(body: any, lang: string = 'en'): Promise<AuthResponse> {
    const { user_DNI_number, user_password } = body;

    if (!user_DNI_number || !user_password) {
      return {
        success: false,
        message: this.getTranslatedMessage(
          'validation.dni_password_required',
          lang,
        ),
        data: null,
      } as any;
    }

    // Find user by DNI number
    const user = await (this.userModel as any).findOne({
      where: { user_DNI_number },
    });

    if (!user) {
      return {
        success: false,
        message: this.getTranslatedMessage('auth.invalid_credentials', lang),
        data: null,
      } as any;
    }

    if (user.user_status !== UserStatus.ACTIVE) {
      return {
        success: false,
        message: this.getTranslatedMessage('auth.account_not_active', lang),
        data: null,
      } as any;
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(user_password);
    if (!isPasswordValid) {
      return {
        success: false,
        message: this.getTranslatedMessage('auth.invalid_credentials', lang),
        data: null,
      } as any;
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate access token
    const accessToken = await this.generateAccessToken(user);

    return {
      success: true,
      message: this.getTranslatedMessage('auth.login_success', lang),
      data: {
        user: this.sanitizeUser(user),
        accessToken,
        expiresIn: this.getTokenExpirationTime(),
        tokenType: 'Bearer',
      },
    };
  }

  async logout(user?: User, lang: string = 'en'): Promise<StandardResponse> {
    // Since we're not using sessions, logout is handled client-side by removing the token
    // We could add additional logout logic here if needed (e.g., token blacklisting)

    if (user) {
      this.logger.log(`User ${user.user_email} logged out successfully`);
    }

    return {
      success: true,
      message: this.getTranslatedMessage('auth.logout_success', lang),
    };
  }

  async forgotPassword(
    body: any,
    lang: string = 'en',
  ): Promise<StandardResponse> {
    const { user_DNI_number, new_password, confirm_password } = body;

    // Joi validation handles all field validation and password matching

    // Find user by DNI number
    const user = await (this.userModel as any).findOne({
      where: { user_DNI_number },
    });

    if (!user) {
      return {
        success: false,
        message: this.getTranslatedMessage('auth.user_not_found', lang),
        data: null,
      };
    }

    // Check if new password is same as current password
    const isSameAsCurrentPassword = await user.validatePassword(new_password);
    if (isSameAsCurrentPassword) {
      return {
        success: false,
        message: this.getTranslatedMessage(
          'auth.new_password_same_as_current',
          lang,
        ),
        data: null,
      };
    }

    // Update password
    await user.update({
      user_password: new_password, // Will be hashed by the model hook
    });

    return {
      success: true,
      message: this.getTranslatedMessage('auth.password_reset_success', lang),
    };
  }

  async resetPassword(
    body: any,
    lang: string = 'en',
  ): Promise<StandardResponse> {
    const { token, new_password } = body;

    if (!token || !new_password) {
      return {
        success: false,
        message: this.getTranslatedMessage(
          'validation.token_password_required',
          lang,
        ),
        data: null,
      };
    }

    // Find user by reset token
    const user = await this.userModel.findOne({
      where: {
        resetToken: token,
        resetTokenExpiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return {
        success: false,
        message: this.getTranslatedMessage('auth.invalid_expired_token', lang),
        data: null,
      };
    }

    // Update password and clear reset token
    await user.update({
      user_password: new_password, // Will be hashed by the model hook
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
    });

    return {
      success: true,
      message: this.getTranslatedMessage('auth.password_reset_success', lang),
    };
  }

  async resetPasswordWithToken(
    body: any,
    currentUser: User,
    lang: string = 'en',
  ): Promise<StandardResponse> {
    const { new_password, confirm_password } = body;

    // Joi validation handles all field validation and password matching

    // Update password for the authenticated user
    await currentUser.update({
      user_password: new_password, // Will be hashed by the model hook
    });

    return {
      success: true,
      message: this.getTranslatedMessage('auth.password_reset_success', lang),
    };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      user_email: user.user_email,
      user_role: user.user_role,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });
  }

  private getTokenExpirationTime(): number {
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '15m';
    // Convert to seconds (assuming format like '15m', '1h', etc.)
    if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60;
    } else if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 3600;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 86400;
    }
    return 900; // Default 15 minutes
  }

  private sanitizeUser(user: User): SafeUser {
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

  private getTranslatedMessage(key: string, lang: string = 'en'): string {
    // Translation mapping - temporary fix until i18n issue is resolved
    const translations = {
      en: {
        'validation.email_already_exists': 'Email already exists',
        'validation.phone_already_exists': 'Phone number already exists',
        'validation.document_already_exists': 'Document number already exists',
        'validation.required_fields_missing': 'Missing required fields',
        'validation.passwords_do_not_match': 'Passwords do not match',
        'validation.dni_password_required':
          'DNI number and password are required',
        'validation.dni_required': 'DNI number is required',
        'validation.dni_number_required':
          'DNI number is required for registration',
        'validation.token_password_required':
          'Token and new password are required',
        'auth.registration_success': 'User registered successfully',
        'auth.login_success': 'Login successful',
        'auth.logout_success': 'Logout successful',
        'auth.invalid_credentials': 'Invalid credentials',
        'auth.account_not_active': 'Account is not active',
        'auth.password_reset_sent':
          'If the email exists, a password reset link has been sent',
        'auth.password_reset_success': 'Password has been reset successfully',
        'auth.invalid_expired_token': 'Invalid or expired token',
        'auth.new_password_same_as_current':
          'New password cannot be the same as current password',
        'auth.password_changed_success': 'Password changed successfully',
        'auth.user_not_found': 'User not found',
        'validation.all_fields_required':
          'All required fields must be provided',
        'validation.passwords_dont_match':
          'New password and confirmation do not match',
        'validation.password_fields_required':
          'New password and confirmation are required',
      },
      es: {
        'validation.email_already_exists': 'El email ya existe',
        'validation.phone_already_exists': 'El número de teléfono ya existe',
        'validation.document_already_exists':
          'El número de documento ya existe',
        'validation.required_fields_missing': 'Faltan campos requeridos',
        'validation.passwords_do_not_match': 'Las contraseñas no coinciden',
        'validation.dni_password_required':
          'Se requiere número de DNI y contraseña',
        'validation.dni_required': 'Se requiere número de DNI',
        'validation.dni_number_required':
          'Se requiere número de DNI para el registro',
        'validation.token_password_required':
          'Se requiere token y nueva contraseña',
        'auth.registration_success': 'Usuario registrado exitosamente',
        'auth.login_success': 'Inicio de sesión exitoso',
        'auth.logout_success': 'Cierre de sesión exitoso',
        'auth.invalid_credentials': 'Credenciales inválidas',
        'auth.account_not_active': 'La cuenta no está activa',
        'auth.password_reset_sent':
          'Si el email existe, se ha enviado un enlace para restablecer la contraseña',
        'auth.password_reset_success':
          'La contraseña ha sido restablecida exitosamente',
        'auth.invalid_expired_token': 'Token inválido o expirado',
        'auth.new_password_same_as_current':
          'La nueva contraseña no puede ser la misma que la actual',
        'auth.password_changed_success': 'Contraseña cambiada exitosamente',
        'auth.user_not_found': 'Usuario no encontrado',
        'validation.all_fields_required':
          'Todos los campos requeridos deben ser proporcionados',
        'validation.passwords_dont_match':
          'La nueva contraseña y la confirmación no coinciden',
        'validation.password_fields_required':
          'La nueva contraseña y la confirmación son requeridas',
      },
      fr: {
        'validation.email_already_exists': "L'email existe déjà",
        'validation.phone_already_exists': 'Le numéro de téléphone existe déjà',
        'validation.document_already_exists':
          'Le numéro de document existe déjà',
        'validation.required_fields_missing': 'Champs requis manquants',
        'validation.passwords_do_not_match':
          'Les mots de passe ne correspondent pas',
        'validation.dni_password_required': 'Numéro DNI et mot de passe requis',
        'validation.dni_required': 'Numéro DNI requis',
        'validation.dni_number_required':
          "Numéro DNI requis pour l'inscription",
        'validation.token_password_required':
          'Token et nouveau mot de passe requis',
        'auth.registration_success': 'Utilisateur enregistré avec succès',
        'auth.login_success': 'Connexion réussie',
        'auth.logout_success': 'Déconnexion réussie',
        'auth.invalid_credentials': 'Identifiants invalides',
        'auth.account_not_active': "Le compte n'est pas actif",
        'auth.password_reset_sent':
          "Si l'email existe, un lien de réinitialisation du mot de passe a été envoyé",
        'auth.password_reset_success':
          'Le mot de passe a été réinitialisé avec succès',
        'auth.invalid_expired_token': 'Token invalide ou expiré',
      },
    };

    const langKey = lang?.substring(0, 2) || 'en'; // Support lang codes like 'en-US'
    const langMessages = translations[langKey] || translations['en'];
    return langMessages[key] || key; // Fallback to key if translation not found
  }
}
