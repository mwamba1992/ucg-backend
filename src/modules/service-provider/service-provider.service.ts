import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { ServiceProvider, OnboardingStatus } from './entities/service-provider.entity';
import { ServiceProviderContact } from './entities/service-provider-contact.entity';
import { ServiceProviderBankAccount } from './entities/service-provider-bank-account.entity';
import { ServiceProviderSettings } from './entities/service-provider-settings.entity';
import { CreateServiceProviderDto } from './dto/create-service-provider.dto';
import { UpdateServiceProviderDto } from './dto/update-service-provider.dto';
import { QueryServiceProviderDto } from './dto/query-service-provider.dto';
import * as crypto from 'crypto';

@Injectable()
export class ServiceProviderService {
  constructor(
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
    @InjectRepository(ServiceProviderContact)
    private readonly contactRepository: Repository<ServiceProviderContact>,
    @InjectRepository(ServiceProviderBankAccount)
    private readonly bankAccountRepository: Repository<ServiceProviderBankAccount>,
    @InjectRepository(ServiceProviderSettings)
    private readonly settingsRepository: Repository<ServiceProviderSettings>,
  ) {}

  /**
   * Generate unique SP code (3 characters)
   */
  private async generateSpCode(businessName: string): Promise<string> {
    // Extract first 3 letters from business name
    const prefix = businessName
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase();

    let spCode = prefix;
    let counter = 0;

    // Check if code already exists, if yes, add numbers
    while (await this.serviceProviderRepository.findOne({ where: { spCode } })) {
      counter++;
      if (counter > 999) {
        throw new BadRequestException('Unable to generate unique SP code');
      }
      spCode = prefix.substring(0, 2) + counter.toString().padStart(1, '0');
    }

    return spCode;
  }

  /**
   * Generate API key for service provider
   */
  private generateApiKey(): string {
    return `ucg_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Create a new service provider with related entities
   */
  async create(createDto: CreateServiceProviderDto): Promise<ServiceProvider> {
    // Check if email already exists
    const existingEmail = await this.serviceProviderRepository.findOne({
      where: { email: createDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Generate SP code
    const spCode = await this.generateSpCode(createDto.businessName);

    // Create service provider (main entity)
    const serviceProvider = this.serviceProviderRepository.create({
      spCode,
      businessName: createDto.businessName,
      businessType: createDto.businessType,
      registrationNumber: createDto.registrationNumber,
      tinNumber: createDto.tinNumber,
      phoneNumber: createDto.phoneNumber,
      email: createDto.email,
      physicalAddress: createDto.physicalAddress,
      region: createDto.region,
      district: createDto.district,
      status: OnboardingStatus.PENDING,
    });

    // Save service provider first to get the ID
    const savedSp = await this.serviceProviderRepository.save(serviceProvider);

    // Create contact
    const contact = this.contactRepository.create({
      ...createDto.contact,
      serviceProviderId: savedSp.id,
    });
    await this.contactRepository.save(contact);

    // Create bank accounts
    const bankAccounts = createDto.bankAccounts.map((account) =>
      this.bankAccountRepository.create({
        ...account,
        serviceProviderId: savedSp.id,
      }),
    );
    await this.bankAccountRepository.save(bankAccounts);

    // Create settings (use defaults if not provided)
    const settings = this.settingsRepository.create({
      ...createDto.settings,
      serviceProviderId: savedSp.id,
    });
    await this.settingsRepository.save(settings);

    // Reload with relations
    return await this.findOne(savedSp.id);
  }

  /**
   * Get all service providers with filters and pagination
   */
  async findAll(query: QueryServiceProviderDto) {
    const { page = 1, limit = 10, businessType, status, search, region } = query;

    const where: FindOptionsWhere<ServiceProvider> = {};

    if (businessType) {
      where.businessType = businessType;
    }

    if (status) {
      where.status = status;
    }

    if (region) {
      where.region = region;
    }

    const queryBuilder = this.serviceProviderRepository
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.contact', 'contact')
      .leftJoinAndSelect('sp.bankAccounts', 'bankAccounts')
      .leftJoinAndSelect('sp.settings', 'settings')
      .where(where);

    // Search functionality
    if (search) {
      queryBuilder.andWhere(
        '(sp.businessName ILIKE :search OR sp.email ILIKE :search OR sp.spCode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Order by creation date
    queryBuilder.orderBy('sp.createdAt', 'DESC');

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get service provider by ID
   */
  async findOne(id: string): Promise<ServiceProvider> {
    const serviceProvider = await this.serviceProviderRepository.findOne({
      where: { id },
      relations: ['contact', 'bankAccounts', 'settings'],
    });

    if (!serviceProvider) {
      throw new NotFoundException(`Service Provider with ID ${id} not found`);
    }

    return serviceProvider;
  }

  /**
   * Get service provider by SP code
   */
  async findBySpCode(spCode: string): Promise<ServiceProvider> {
    const serviceProvider = await this.serviceProviderRepository.findOne({
      where: { spCode },
      relations: ['contact', 'bankAccounts', 'settings'],
    });

    if (!serviceProvider) {
      throw new NotFoundException(`Service Provider with code ${spCode} not found`);
    }

    return serviceProvider;
  }

  /**
   * Update service provider
   */
  async update(
    id: string,
    updateDto: UpdateServiceProviderDto,
  ): Promise<ServiceProvider> {
    const serviceProvider = await this.findOne(id);

    // If email is being updated, check for duplicates
    if (updateDto.email && updateDto.email !== serviceProvider.email) {
      const existingEmail = await this.serviceProviderRepository.findOne({
        where: { email: updateDto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Email already in use');
      }
    }

    // Update main entity fields
    Object.assign(serviceProvider, {
      businessName: updateDto.businessName,
      businessType: updateDto.businessType,
      registrationNumber: updateDto.registrationNumber,
      tinNumber: updateDto.tinNumber,
      phoneNumber: updateDto.phoneNumber,
      email: updateDto.email,
      physicalAddress: updateDto.physicalAddress,
      region: updateDto.region,
      district: updateDto.district,
      status: updateDto.status,
      rejectionReason: updateDto.rejectionReason,
    });

    // Update contact if provided
    if (updateDto.contact) {
      await this.contactRepository.update(
        { serviceProviderId: id },
        updateDto.contact,
      );
    }

    // Update settings if provided
    if (updateDto.settings) {
      await this.settingsRepository.update(
        { serviceProviderId: id },
        updateDto.settings,
      );
    }

    await this.serviceProviderRepository.save(serviceProvider);

    return await this.findOne(id);
  }

  /**
   * Approve service provider
   */
  async approve(id: string, approvedBy: string): Promise<ServiceProvider> {
    const serviceProvider = await this.findOne(id);

    if (serviceProvider.status === OnboardingStatus.APPROVED) {
      throw new BadRequestException('Service Provider is already approved');
    }

    // Generate API key if not exists
    if (!serviceProvider.apiKey) {
      serviceProvider.apiKey = this.generateApiKey();
    }

    serviceProvider.status = OnboardingStatus.APPROVED;
    serviceProvider.approvedAt = new Date();
    serviceProvider.approvedBy = approvedBy;
    serviceProvider.isActive = true;

    await this.serviceProviderRepository.save(serviceProvider);

    return await this.findOne(id);
  }

  /**
   * Reject service provider
   */
  async reject(
    id: string,
    rejectionReason: string,
  ): Promise<ServiceProvider> {
    const serviceProvider = await this.findOne(id);

    serviceProvider.status = OnboardingStatus.REJECTED;
    serviceProvider.rejectionReason = rejectionReason;

    await this.serviceProviderRepository.save(serviceProvider);

    return await this.findOne(id);
  }

  /**
   * Activate/Deactivate service provider
   */
  async toggleActivation(id: string): Promise<ServiceProvider> {
    const serviceProvider = await this.findOne(id);

    serviceProvider.isActive = !serviceProvider.isActive;

    await this.serviceProviderRepository.save(serviceProvider);

    return await this.findOne(id);
  }

  /**
   * Soft delete service provider
   */
  async remove(id: string): Promise<void> {
    const serviceProvider = await this.findOne(id);

    serviceProvider.deletedAt = new Date();
    serviceProvider.isActive = false;

    await this.serviceProviderRepository.save(serviceProvider);
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const total = await this.serviceProviderRepository.count();
    const pending = await this.serviceProviderRepository.count({
      where: { status: OnboardingStatus.PENDING },
    });
    const approved = await this.serviceProviderRepository.count({
      where: { status: OnboardingStatus.APPROVED },
    });
    const active = await this.serviceProviderRepository.count({
      where: { isActive: true },
    });

    return {
      total,
      pending,
      approved,
      active,
      rejected: await this.serviceProviderRepository.count({
        where: { status: OnboardingStatus.REJECTED },
      }),
    };
  }
}
