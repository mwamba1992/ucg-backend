import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User, UserRole, UserType } from './entities/user.entity';
import { UserServiceProvider } from './entities/user-service-provider.entity';
import {
  OnboardingStatus,
  ServiceProvider,
} from '../service-provider/entities/service-provider.entity';

export const SP_ROLES: string[] = [
  UserRole.SP_ADMIN,
  UserRole.SP_FINANCE,
  UserRole.SP_OPERATOR,
  UserRole.SP_VIEWER,
];

export interface SpAccess {
  serviceProvider: ServiceProvider;
  role: string;
  isPrimary: boolean;
  isDefault: boolean;
}

/**
 * Resolves which service providers a SERVICE_PROVIDER user can act for.
 *
 * Primary SP (legacy, unchanged): SP whose email matches the user's email,
 * otherwise the SP whose id is the user's createdBy.
 * Additional SPs: rows in user_service_providers.
 */
@Injectable()
export class SpMembershipService {
  constructor(
    @InjectRepository(UserServiceProvider)
    private readonly membershipRepository: Repository<UserServiceProvider>,
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** True when the SP may be logged into (same checks the SP login has always applied). */
  static isUsable(sp: ServiceProvider): boolean {
    return (
      sp.isActive &&
      (sp.status === OnboardingStatus.APPROVED || sp.status === OnboardingStatus.ACTIVE) &&
      !sp.deletedAt
    );
  }

  async getPrimaryServiceProvider(user: Pick<User, 'email' | 'createdBy'>): Promise<ServiceProvider | null> {
    const byEmail = await this.serviceProviderRepository.findOne({ where: { email: user.email } });
    if (byEmail) return byEmail;
    if (!user.createdBy) return null;
    return this.serviceProviderRepository.findOne({ where: { id: user.createdBy } });
  }

  /** All service providers the user is attached to, primary first. Includes unusable ones. */
  async listAccess(user: Pick<User, 'id' | 'email' | 'createdBy' | 'role'>): Promise<SpAccess[]> {
    const result: SpAccess[] = [];

    const primary = await this.getPrimaryServiceProvider(user);
    if (primary) {
      result.push({ serviceProvider: primary, role: user.role, isPrimary: true, isDefault: false });
    }

    const memberships = await this.membershipRepository.find({
      where: { userId: user.id },
      relations: ['serviceProvider'],
      order: { createdAt: 'ASC' },
    });
    for (const m of memberships) {
      if (!m.serviceProvider || m.serviceProviderId === primary?.id) continue;
      result.push({
        serviceProvider: m.serviceProvider,
        role: m.role || user.role,
        isPrimary: false,
        isDefault: m.isDefault,
      });
    }

    return result;
  }

  /** The user's role within the given SP, or null when they have no access to it. */
  async getRoleFor(
    user: Pick<User, 'id' | 'email' | 'createdBy' | 'role'>,
    serviceProvider: Pick<ServiceProvider, 'id' | 'email'>,
  ): Promise<string | null> {
    if (serviceProvider.email === user.email || user.createdBy === serviceProvider.id) {
      return user.role;
    }
    const membership = await this.membershipRepository.findOne({
      where: { userId: user.id, serviceProviderId: serviceProvider.id },
    });
    return membership ? membership.role || user.role : null;
  }

  // ---------------------------------------------------------------------------
  // Admin management of additional service provider access
  // ---------------------------------------------------------------------------

  async listLinkedUsers(serviceProviderId: string) {
    await this.findServiceProvider(serviceProviderId);
    const memberships = await this.membershipRepository.find({
      where: { serviceProviderId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    return memberships
      .filter((m) => m.user && !m.user.deletedAt)
      .map((m) => ({
        userId: m.userId,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        status: m.user.status,
        role: m.role || m.user.role,
        isDefault: m.isDefault,
        linkedAt: m.createdAt,
      }));
  }

  async linkUser(
    serviceProviderId: string,
    data: { email: string; role?: string; isDefault?: boolean },
    linkedBy?: string,
  ): Promise<UserServiceProvider> {
    const serviceProvider = await this.findServiceProvider(serviceProviderId);

    if (data.role && !SP_ROLES.includes(data.role)) {
      throw new BadRequestException(`Invalid role. Allowed: ${SP_ROLES.join(', ')}`);
    }

    const user = await this.userRepository.findOne({
      where: { email: data.email, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`User with email ${data.email} not found`);
    }
    if (user.userType !== UserType.SERVICE_PROVIDER) {
      throw new BadRequestException('Only SERVICE_PROVIDER users can be linked to a service provider');
    }
    if (user.email === serviceProvider.email || user.createdBy === serviceProvider.id) {
      throw new ConflictException('User already belongs to this service provider');
    }

    const existing = await this.membershipRepository.findOne({
      where: { userId: user.id, serviceProviderId },
    });
    if (existing) {
      throw new ConflictException('User is already linked to this service provider');
    }

    if (data.isDefault) {
      await this.membershipRepository.update({ userId: user.id }, { isDefault: false });
    }

    return this.membershipRepository.save(
      this.membershipRepository.create({
        userId: user.id,
        serviceProviderId,
        role: data.role || null,
        isDefault: !!data.isDefault,
        createdBy: linkedBy,
      }),
    );
  }

  async unlinkUser(serviceProviderId: string, userId: string): Promise<void> {
    const result = await this.membershipRepository.delete({ userId, serviceProviderId });
    if (!result.affected) {
      throw new NotFoundException('User is not linked to this service provider');
    }
  }

  private async findServiceProvider(id: string): Promise<ServiceProvider> {
    const sp = await this.serviceProviderRepository.findOne({ where: { id } });
    if (!sp || sp.deletedAt) {
      throw new NotFoundException(`Service provider with ID ${id} not found`);
    }
    return sp;
  }
}
