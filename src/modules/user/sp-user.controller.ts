import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { SpJwtAuthGuard } from '../auth/guards/sp-jwt-auth.guard';
import { UserType, UserRole, UserStatus } from './entities/user.entity';

/**
 * Service Provider User Controller
 *
 * Allows service providers to manage their own users
 */
@ApiTags('Service Provider - Users')
@ApiBearerAuth()
@UseGuards(SpJwtAuthGuard)
@Controller('sp/users')
export class SpUserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user for service provider' })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'User with email already exists' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    const serviceProviderId = req.user.serviceProviderId;

    // Ensure the user being created is a SERVICE_PROVIDER type
    if (createUserDto.userType && createUserDto.userType !== UserType.SERVICE_PROVIDER) {
      throw new BadRequestException('Service providers can only create SERVICE_PROVIDER users');
    }

    // Ensure role is an SP role
    const spRoles: string[] = [UserRole.SP_ADMIN, UserRole.SP_FINANCE, UserRole.SP_OPERATOR, UserRole.SP_VIEWER];
    if (createUserDto.role && !spRoles.includes(createUserDto.role)) {
      throw new BadRequestException('Invalid role for service provider user');
    }

    // Force userType to SERVICE_PROVIDER
    const user = await this.userService.create(
      {
        ...createUserDto,
        userType: UserType.SERVICE_PROVIDER,
        role: createUserDto.role || UserRole.SP_VIEWER,
      },
      serviceProviderId,
    );

    return new UserResponseDto(user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users for this service provider' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(@Query() query: QueryUserDto, @Request() req: any) {
    // Filter to only show SERVICE_PROVIDER users
    const result = await this.userService.findAll({
      ...query,
      userType: UserType.SERVICE_PROVIDER,
    });

    return {
      ...result,
      data: result.data.map((user) => new UserResponseDto(user)),
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get user statistics for this service provider' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics() {
    return await this.userService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<UserResponseDto> {
    const user = await this.userService.findOne(id);

    // Ensure the user is a SERVICE_PROVIDER user
    if (user.userType !== UserType.SERVICE_PROVIDER) {
      throw new BadRequestException('Cannot access non-service provider users');
    }

    return new UserResponseDto(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    const serviceProviderId = req.user.serviceProviderId;

    // Fetch the user first to verify it belongs to this SP
    const existingUser = await this.userService.findOne(id);

    if (existingUser.userType !== UserType.SERVICE_PROVIDER) {
      throw new BadRequestException('Cannot update non-service provider users');
    }

    // Prevent changing userType
    if (updateUserDto.userType && updateUserDto.userType !== UserType.SERVICE_PROVIDER) {
      throw new BadRequestException('Cannot change user type from SERVICE_PROVIDER');
    }

    // Ensure role is an SP role if being updated
    const spRoles: string[] = [UserRole.SP_ADMIN, UserRole.SP_FINANCE, UserRole.SP_OPERATOR, UserRole.SP_VIEWER];
    if (updateUserDto.role && !spRoles.includes(updateUserDto.role)) {
      throw new BadRequestException('Invalid role for service provider user');
    }

    const user = await this.userService.update(id, updateUserDto, serviceProviderId);
    return new UserResponseDto(user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
    @Request() req: any,
  ): Promise<UserResponseDto> {
    // Verify user is SERVICE_PROVIDER type
    const existingUser = await this.userService.findOne(id);

    if (existingUser.userType !== UserType.SERVICE_PROVIDER) {
      throw new BadRequestException('Cannot update non-service provider users');
    }

    const user = await this.userService.updateStatus(id, status);
    return new UserResponseDto(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    // Verify user is SERVICE_PROVIDER type
    const existingUser = await this.userService.findOne(id);

    if (existingUser.userType !== UserType.SERVICE_PROVIDER) {
      throw new BadRequestException('Cannot delete non-service provider users');
    }

    await this.userService.remove(id);
  }
}
