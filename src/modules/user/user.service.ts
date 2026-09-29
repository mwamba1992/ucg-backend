import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, UserType } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { RolesService } from '../permission/roles.service';

export interface SpUserScope {
  id: string;
  email: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly rolesService: RolesService,
  ) {}

  /** Reject roles that don't exist / aren't active in the roles table. */
  private async assertRoleExists(role?: string): Promise<void> {
    if (role && !(await this.rolesService.isValidRole(role))) {
      throw new BadRequestException(`Unknown or inactive role: ${role}`);
    }
  }

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

    await this.assertRoleExists(createUserDto.role);

    const user = this.userRepository.create({
      ...createUserDto,
      createdBy,
    });

    return await this.userRepository.save(user);
  }

  /**
   * Find all users with pagination and filtering
   */
  async findAll(query: QueryUserDto, spScope?: SpUserScope) {
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

    if (spScope) {
      queryBuilder.andWhere('(user.createdBy = :spId OR user.email = :spEmail)', {
        spId: spScope.id,
        spEmail: spScope.email,
      });
    }

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
   * Whether a user belongs to the given service provider. SP membership mirrors
   * spLogin: the SP's main account shares the SP email, staff users are created by the SP.
   */
  belongsToServiceProvider(user: User, spScope: SpUserScope): boolean {
    return (
      user.userType === UserType.SERVICE_PROVIDER &&
      (user.createdBy === spScope.id || user.email === spScope.email)
    );
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

    await this.assertRoleExists(updateUserDto.role);

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
   * Count non-deleted users of a type, optionally by status
   */
  async countByType(userType: UserType, status?: UserStatus): Promise<number> {
    return await this.userRepository.count({
      where: { userType, deletedAt: IsNull(), ...(status ? { status } : {}) },
    });
  }

  /**
   * Get user statistics
   */
  async getStatistics(spScope?: SpUserScope) {
    const count = (status?: UserStatus) => {
      const qb = this.userRepository
        .createQueryBuilder('user')
        .where('user.deletedAt IS NULL');
      if (status) {
        qb.andWhere('user.status = :status', { status });
      }
      if (spScope) {
        qb.andWhere('user.userType = :userType', { userType: UserType.SERVICE_PROVIDER }).andWhere(
          '(user.createdBy = :spId OR user.email = :spEmail)',
          { spId: spScope.id, spEmail: spScope.email },
        );
      }
      return qb.getCount();
    };

    const [total, active, inactive, suspended, pending] = await Promise.all([
      count(),
      count(UserStatus.ACTIVE),
      count(UserStatus.INACTIVE),
      count(UserStatus.SUSPENDED),
      count(UserStatus.PENDING),
    ]);

    return {
      total,
      active,
      inactive,
      suspended,
      pending,
    };
  }
}
