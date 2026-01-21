import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto, createdBy?: string): Promise<User> {
    // Check if user with email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      createdBy,
    });

    return await this.userRepository.save(user);
  }

  /**
   * Find all users with pagination and filtering
   */
  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, email, userType, role, status, search } = query;

    const where: any = {
      deletedAt: IsNull(),
    };

    if (email) {
      where.email = email;
    }

    if (userType) {
      where.userType = userType;
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    // Build query
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    queryBuilder.where(where);

    // Add search functionality
    if (search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by creation date
    queryBuilder.orderBy('user.createdAt', 'DESC');

    // Execute query
    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a user by ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email, deletedAt: IsNull() },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'phoneNumber', 'userType', 'role', 'status', 'deletedAt', 'createdBy'],
    });
  }

  /**
   * Update a user
   */
  async update(id: string, updateUserDto: UpdateUserDto, updatedBy?: string): Promise<User> {
    const user = await this.findOne(id);

    // Check if email is being updated and already exists
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    user.updatedBy = updatedBy;

    return await this.userRepository.save(user);
  }

  /**
   * Soft delete a user
   */
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.deletedAt = new Date();
    user.status = UserStatus.INACTIVE;
    await this.userRepository.save(user);
  }

  /**
   * Hard delete a user (use with caution)
   */
  async hardDelete(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  /**
   * Change user password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'password', 'email', 'firstName', 'lastName', 'role', 'status'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update to new password
    user.password = newPassword;
    await this.userRepository.save(user);
  }

  /**
   * Reset user password (admin function)
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findOne(id);
    user.password = newPassword;
    await this.userRepository.save(user);
  }

  /**
   * Update user status
   */
  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const user = await this.findOne(id);
    user.status = status;
    return await this.userRepository.save(user);
  }

  /**
   * Update last login time
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  /**
   * Update refresh token
   */
  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    const hashedToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userRepository.update(id, { refreshToken: hashedToken });
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    const total = await this.userRepository.count({
      where: { deletedAt: IsNull() },
    });

    const active = await this.userRepository.count({
      where: { status: UserStatus.ACTIVE, deletedAt: IsNull() },
    });

    const inactive = await this.userRepository.count({
      where: { status: UserStatus.INACTIVE, deletedAt: IsNull() },
    });

    const suspended = await this.userRepository.count({
      where: { status: UserStatus.SUSPENDED, deletedAt: IsNull() },
    });

    const pending = await this.userRepository.count({
      where: { status: UserStatus.PENDING, deletedAt: IsNull() },
    });

    return {
      total,
      active,
      inactive,
      suspended,
      pending,
    };
  }
}
