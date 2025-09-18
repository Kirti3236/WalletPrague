import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
  UsePipes,
} from '@nestjs/common';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { PasswordMatch } from '../../common/validators/password-match.validator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { I18nService } from 'nestjs-i18n';
import { Lang } from '../../common/decorators/lang.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiProperty,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { AuthService } from './auth.service';
import {
  AuthResponse,
  StandardResponse,
} from './interfaces/auth-response.interface';
import { JoiValidationPipe } from './pipes/joi-validation.pipe';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './validators/auth.validators';

// Request body classes for Swagger documentation
class RegisterRequest {
  // Required fields for registration
  @ApiProperty({ example: 'John', required: true })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/, {
    message: 'Name must contain only letters, spaces, hyphens and apostrophes',
  })
  user_first_name: string;

  @ApiProperty({ example: 'Doe', required: true })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/, {
    message: 'Name must contain only letters, spaces, hyphens and apostrophes',
  })
  user_last_name: string;

  @ApiProperty({ example: '12345678', required: true })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'DNI number must contain only letters and numbers',
  })
  user_DNI_number: string;

  @ApiProperty({ example: 'SecurePassword123!', required: true })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least 8 characters with uppercase, lowercase, number and special character',
  })
  user_password: string;

  @ApiProperty({ example: 'SecurePassword123!', required: true })
  @IsString()
  @PasswordMatch('user_password')
  confirm_password: string;

  // Optional fields (for future use)
  @ApiProperty({
    example: 'john.doe@example.com',
    required: false,
    description: 'Optional email address for future use',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  user_email?: string;

  @ApiProperty({
    example: '+1234567890',
    required: false,
    description: 'Optional phone number for future use',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Please provide a valid phone number',
  })
  user_phone_number?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Front ID document file upload',
  })
  @IsOptional()
  frontIdFile?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Back ID document file upload',
  })
  @IsOptional()
  backIdFile?: any;
}

class LoginRequest {
  @ApiProperty({ example: '12345678', required: true })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'DNI number must contain only letters and numbers',
  })
  user_DNI_number: string;

  @ApiProperty({ example: 'SecurePassword123!', required: true })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  user_password: string;
}

class ForgotPasswordRequest {
  @ApiProperty({ example: '12345678', required: true })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'DNI number must contain only letters and numbers',
  })
  user_DNI_number: string;
}

class ResetPasswordRequest {
  @ApiProperty({ example: 'abc123def456', required: true })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  token: string;

  @ApiProperty({ example: 'NewSecurePassword123!', required: true })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least 8 characters with uppercase, lowercase, number and special character',
  })
  new_password: string;
}

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly i18n: I18nService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'frontIdFile', maxCount: 1 },
        { name: 'backIdFile', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: './src/uploads/documents',
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        }),
        fileFilter: (req, file, callback) => {
          if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf)$/)) {
            return callback(
              new Error('Only image and PDF files are allowed!'),
              false,
            );
          }
          callback(null, true);
        },
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB limit
        },
      },
    ),
  )
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Register a new user with first name, last name, DNI number and password. Email and phone are optional for future use.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Required: first_name, last_name, user_DNI_number, user_password, confirm_password. Optional: user_email, user_phone_number, file uploads',
    type: RegisterRequest,
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - user already exists',
  })
  async register(
    @Body() body: RegisterRequest,
    @UploadedFiles()
    files?: {
      frontIdFile?: Express.Multer.File[];
      backIdFile?: Express.Multer.File[];
    },
    @Lang() lang?: string,
  ): Promise<AuthResponse> {
    return this.authService.register(body, files, lang);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user using DNI number and password',
  })
  @ApiBody({
    description: 'User login credentials',
    type: LoginRequest,
    examples: {
      example1: {
        summary: 'Valid login request',
        value: {
          user_DNI_number: '12345678',
          user_password: 'SecurePassword123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing credentials',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials',
  })
  async login(
    @Body(new JoiValidationPipe(loginSchema)) body: LoginRequest,
    @Lang() lang?: string,
  ): Promise<AuthResponse> {
    return this.authService.login(body, lang);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout authenticated user (requires valid JWT token)',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async logout(
    @Req() req: any,
    @Lang() lang?: string,
  ): Promise<StandardResponse> {
    return this.authService.logout(req.user, lang);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initiate password reset',
    description:
      'Send password reset token using DNI number. Only requires DNI number - no password fields needed. For security, always returns success regardless of whether DNI exists.',
  })
  @ApiBody({
    description: 'User DNI number for password reset',
    type: ForgotPasswordRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset notification sent (if DNI exists)',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - DNI number required',
  })
  async forgotPassword(
    @Body() body: ForgotPasswordRequest,
    @Lang() lang?: string,
  ): Promise<StandardResponse> {
    return this.authService.forgotPassword(body, lang);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Reset user password using reset token from forgot password email. This endpoint is public because users who forgot their password cannot authenticate with JWT. Uses secure reset token instead.',
  })
  @ApiBody({
    description: 'Reset token and new password',
    type: ResetPasswordRequest,
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid or expired token',
  })
  async resetPassword(
    @Body() body: ResetPasswordRequest,
    @Lang() lang?: string,
  ): Promise<StandardResponse> {
    return this.authService.resetPassword(body, lang);
  }
}
