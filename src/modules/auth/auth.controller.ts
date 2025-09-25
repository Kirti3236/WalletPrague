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
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { PasswordMatch } from '../../common/decorators/password-match.decorator';
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
// Using global ValidationPipe with class-validator decorators

// Request body classes with class-validator decorators
class RegisterRequest {
  // Required fields for registration
  @ApiProperty({ example: 'John', required: true })
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/, {
    message:
      'First name must contain only letters, spaces, hyphens and apostrophes',
  })
  user_first_name: string;

  @ApiProperty({ example: 'Doe', required: true })
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @Matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/, {
    message:
      'Last name must contain only letters, spaces, hyphens and apostrophes',
  })
  user_last_name: string;

  @ApiProperty({ example: '12345678', required: true })
  @IsString()
  @MinLength(6, { message: 'DNI number must be at least 6 characters long' })
  @MaxLength(20, { message: 'DNI number must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'DNI number must contain only letters and numbers',
  })
  user_DNI_number: string;

  @ApiProperty({ example: 'SecurePassword123', required: true })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message:
      'Password must contain at least 8 characters with uppercase, lowercase, and number',
  })
  user_password: string;

  @ApiProperty({ example: 'SecurePassword123', required: true })
  @IsString()
  @PasswordMatch('user_password', { message: 'Passwords do not match' })
  confirm_password: string;

  // Optional fields (for future use)
  @ApiProperty({
    example: 'john.doe@example.com',
    required: false,
    description: 'Optional email address for future use',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'Please provide a valid email address',
  })
  user_email?: string;

  @ApiProperty({
    example: '+1234567890',
    required: false,
    description: 'Optional phone number for future use',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
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
  frontIdFile?: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Back ID document file upload',
  })
  backIdFile?: any;
}

class LoginRequest {
  @ApiProperty({ example: '12345678', required: true })
  @IsString()
  @MinLength(6, { message: 'DNI number must be at least 6 characters long' })
  @MaxLength(20, { message: 'DNI number must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'DNI number must contain only letters and numbers',
  })
  user_DNI_number: string;

  @ApiProperty({ example: 'SecurePassword123!', required: true })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  user_password: string;
}

class ForgotPasswordRequest {
  @ApiProperty({ example: '12345678', required: true })
  @IsString()
  @MinLength(6, { message: 'DNI number must be at least 6 characters long' })
  @MaxLength(20, { message: 'DNI number must not exceed 20 characters' })
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'DNI number must contain only letters and numbers',
  })
  user_DNI_number: string;

  @ApiProperty({ example: 'NewSecurePassword123', required: true })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(128, { message: 'New password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message:
      'New password must contain at least 8 characters with uppercase, lowercase, and number',
  })
  new_password: string;

  @ApiProperty({ example: 'NewSecurePassword123', required: true })
  @IsString()
  @PasswordMatch('new_password', { message: 'Passwords do not match' })
  confirm_password: string;
}

@ApiTags('🌐 Authentication')
@Controller('public/auth')
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
    summary: '🌐 Register a new user',
    description:
      '**PUBLIC ENDPOINT** - Register a new user with first name, last name, DNI number and password. Email and phone are optional for future use. No authentication required.',
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

  @Post('register-json')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '🌐 Register a new user (JSON)',
    description:
      '**PUBLIC ENDPOINT** - Register a new user with JSON payload. For testing and clients that prefer JSON over multipart/form-data. No file uploads supported in this endpoint.',
  })
  @ApiBody({
    description:
      'Required: first_name, last_name, user_DNI_number, user_password, confirm_password. Optional: user_email, user_phone_number',
    type: RegisterRequest,
    examples: {
      example1: {
        summary: 'Valid JSON registration',
        value: {
          user_first_name: 'John',
          user_last_name: 'Doe',
          user_DNI_number: '87654321',
          user_password: 'SecurePassword123!',
          confirm_password: 'SecurePassword123!',
          user_email: 'john.doe@example.com',
          user_phone_number: '+1234567890',
        },
      },
    },
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
  async registerJson(
    @Body() body: RegisterRequest,
    @Lang() lang?: string,
  ): Promise<AuthResponse> {
    const result = await this.authService.register(body, null, lang); // No files for JSON endpoint

    // If registration failed, throw appropriate HTTP exception
    if (!result.success) {
      if (
        result.message.includes('already exists') ||
        result.message.includes('duplicate')
      ) {
        throw new ConflictException(result.message);
      } else {
        throw new BadRequestException(result.message);
      }
    }

    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🌐 User login',
    description:
      '**PUBLIC ENDPOINT** - Authenticate user using DNI number and password. Returns JWT token for accessing private endpoints.',
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
    @Body() body: LoginRequest,
    @Lang() lang?: string,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(body, lang);

    // If login failed, throw appropriate HTTP exception
    if (!result.success) {
      throw new UnauthorizedException(result.message);
    }

    return result;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🌐 Reset forgotten password',
    description:
      '**PUBLIC ENDPOINT** - Reset user password when they have forgotten it. Requires only DNI number and new password. System validates that new password is different from current password.',
  })
  @ApiBody({
    description: 'DNI number, new password, and confirmation',
    type: ForgotPasswordRequest,
    examples: {
      example1: {
        summary: 'Valid forgot password request',
        value: {
          user_DNI_number: '12345678',
          new_password: 'NewSecurePassword123!',
          confirm_password: 'NewSecurePassword123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - validation failed or new password same as current password',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found with provided DNI number',
  })
  async forgotPassword(
    @Body() body: ForgotPasswordRequest,
    @Lang() lang?: string,
  ): Promise<StandardResponse> {
    return this.authService.forgotPassword(body, lang);
  }
}
