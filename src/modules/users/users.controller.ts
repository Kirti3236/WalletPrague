import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  NotFoundException,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { PasswordMatch } from '../../common/decorators/password-match.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Lang } from '../../common/decorators/lang.decorator';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { User } from '../../models/user.model';
import { StandardResponse } from '../auth/interfaces/auth-response.interface';
// Using global ValidationPipe with class-validator decorators

// Request body class for reset password (validation handled by class-validator)
class ResetPasswordRequest {
  @ApiProperty({ example: 'NewSecurePassword123!', required: true })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(128, { message: 'New password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/, {
    message:
      'New password must contain at least 8 characters with uppercase, lowercase, number and special character',
  })
  new_password: string;

  @ApiProperty({ example: 'NewSecurePassword123!', required: true })
  @IsString()
  @PasswordMatch('new_password', { message: 'Passwords do not match' })
  confirm_password: string;
}

@ApiTags('🔐 Users')
@Controller('private/user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  @Get('get-single-user/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Get single user by ID',
    description:
      '**PRIVATE ENDPOINT** - Retrieve a specific user by their ID. Requires valid JWT token for authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getSingleUser(
    @Param('id') id: string,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    // Validate UUID format
    if (!this.isValidUUID(id)) {
      throw new BadRequestException(
        'Invalid user ID format. Must be a valid UUID.',
      );
    }

    const user = await this.usersService.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersService.sanitizeUser(user);
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Get current user profile',
    description:
      "**PRIVATE ENDPOINT** - Retrieve the authenticated user's profile information. Uses JWT token to identify the user.",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getCurrentUserProfile(
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ) {
    return this.usersService.sanitizeUser(currentUser);
  }

  @Get('list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Get all users',
    description:
      '**PRIVATE ENDPOINT** - Retrieve a list of all users. Requires valid JWT token. Admin access might be required in future versions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getAllUsers(@GetUser() currentUser: User, @Lang() lang?: string) {
    const users = await this.usersService.findAll();

    const sanitizedUsers = users.map((user) =>
      this.usersService.sanitizeUser(user),
    );

    return sanitizedUsers;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 User logout',
    description:
      '**PRIVATE ENDPOINT** - Logout authenticated user. Requires valid JWT token for authentication.',
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
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ): Promise<StandardResponse> {
    return this.authService.logout(currentUser, lang);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔐 Reset password',
    description:
      '**PRIVATE ENDPOINT** - Reset user password using JWT token for user identification. Only requires new password and confirmation. User is identified from the JWT token, so no additional identification needed.',
  })
  @ApiBody({
    description: 'New password and confirm password',
    type: ResetPasswordRequest,
    examples: {
      example1: {
        summary: 'Valid password reset request',
        value: {
          new_password: 'NewSecurePassword123!',
          confirm_password: 'NewSecurePassword123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async resetPassword(
    @Body() body: ResetPasswordRequest,
    @GetUser() currentUser: User,
    @Lang() lang?: string,
  ): Promise<StandardResponse> {
    return this.authService.resetPasswordWithToken(body, currentUser, lang);
  }
}
