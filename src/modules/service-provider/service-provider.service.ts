import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Not } from 'typeorm';
import { ServiceProvider, OnboardingStatus } from './entities/service-provider.entity';
import { ServiceProviderContact } from './entities/service-provider-contact.entity';
import { ServiceProviderBankAccount } from './entities/service-provider-bank-account.entity';
import { ServiceProviderSettings } from './entities/service-provider-settings.entity';
import { CreateServiceProviderDto } from './dto/create-service-provider.dto';
import { UpdateServiceProviderDto } from './dto/update-service-provider.dto';
import { QueryServiceProviderDto } from './dto/query-service-provider.dto';
import { CreateBankAccountDto } from './dto/bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { WorkflowService } from '../workflow/workflow.service';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';
import { UserType, UserRole } from '../user/entities/user.entity';
import * as crypto from 'crypto';

@Injectable()
export class ServiceProviderService {
  private readonly logger = new Logger(ServiceProviderService.name);

  constructor(
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
    @InjectRepository(ServiceProviderContact)
    private readonly contactRepository: Repository<ServiceProviderContact>,
    @InjectRepository(ServiceProviderBankAccount)
    private readonly bankAccountRepository: Repository<ServiceProviderBankAccount>,
    @InjectRepository(ServiceProviderSettings)
    private readonly settingsRepository: Repository<ServiceProviderSettings>,
    private readonly workflowService: WorkflowService,
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}

  /**
   * Validate notification settings consistency
   * Ensures at least one notification channel is enabled and webhook config is valid
   */
  private validateNotificationSettings(settings: {
    webhookEnabled?: boolean;
    webhookUrl?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
  }): void {
    if (!settings) return;

    // If webhook is enabled, webhookUrl must be set
    if (settings.webhookEnabled && !settings.webhookUrl) {
      throw new BadRequestException(
        'webhookUrl is required when webhookEnabled is true',
      );
    }

    // If all notification channels are explicitly disabled, reject
    const emailDisabled = settings.emailNotifications === false;
    const smsDisabled = settings.smsNotifications === false;
    const webhookDisabled = !settings.webhookEnabled;

    if (emailDisabled && smsDisabled && webhookDisabled) {
      throw new BadRequestException(
        'At least one notification channel must be enabled (email, SMS, or webhook)',
      );
    }
  }

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
   * Generate a secure random password for service provider
   * Password contains: uppercase, lowercase, numbers, and special characters
   * Length: 12 characters
   */
  private generateSecurePassword(): string {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '@#$%&*!';

    const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;

    // Ensure at least one character from each category
    let password = '';
    password += uppercaseChars[crypto.randomInt(0, uppercaseChars.length)];
    password += lowercaseChars[crypto.randomInt(0, lowercaseChars.length)];
    password += numberChars[crypto.randomInt(0, numberChars.length)];
    password += specialChars[crypto.randomInt(0, specialChars.length)];

    // Fill the rest randomly (total length: 12 characters)
    for (let i = password.length; i < 12; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => crypto.randomInt(0, 2) - 0.5).join('');
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

    // Check if registration number already exists
    const existingRegNumber = await this.serviceProviderRepository.findOne({
      where: { registrationNumber: createDto.registrationNumber },
    });

    if (existingRegNumber) {
      throw new ConflictException('Business registration number already registered');
    }

    // Check if TIN number already exists
    const existingTin = await this.serviceProviderRepository.findOne({
      where: { tinNumber: createDto.tinNumber },
    });

    if (existingTin) {
      throw new ConflictException('TIN number already registered');
    }

    // Generate SP code
    const spCode = await this.generateSpCode(createDto.businessName);

    // Create service provider (main entity)
    const serviceProvider = this.serviceProviderRepository.create({
      spCode,
      businessName: createDto.businessName,
      businessType: createDto.businessType,
      otherBusinessType: createDto.otherBusinessType,
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

    // Validate notification settings before saving
    this.validateNotificationSettings(createDto.settings);

    // Create settings (use defaults if not provided)
    const settings = this.settingsRepository.create({
      ...createDto.settings,
      serviceProviderId: savedSp.id,
    });
    await this.settingsRepository.save(settings);

    // Start onboarding workflow
    try {
      await this.workflowService.startWorkflow({
        entityType: 'SERVICE_PROVIDER',
        entityId: savedSp.id,
        workflowName: 'Service Provider Onboarding',
        metadata: {
          businessType: savedSp.businessType,
          businessName: savedSp.businessName,
          region: savedSp.region,
        },
      });
    } catch (error) {
      // Log warning but don't fail the creation
      // Workflow can be started manually later if needed
      this.logger.warn(`Failed to start workflow for SP ${savedSp.id}:`, error.message);
    }

    // Send registration notification
    try {
      await this.notificationService.notifyServiceProviderRegistration(
        savedSp.email,
        savedSp.phoneNumber,
        savedSp.businessName,
        savedSp.spCode,
      );
    } catch (error) {
      this.logger.error(`Failed to send registration notification: ${error.message}`);
    }

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
    this.logger.log(`🔄 Starting update for Service Provider: ${id}`);
    this.logger.debug(`Update DTO: ${JSON.stringify(updateDto)}`);

    try {
      // Fetch without relations to avoid cascade issues
      this.logger.log(`📥 Fetching service provider without relations...`);
      const serviceProvider = await this.serviceProviderRepository.findOne({
        where: { id },
      });

      if (!serviceProvider) {
        this.logger.error(`❌ Service Provider with ID ${id} not found`);
        throw new NotFoundException(`Service Provider with ID ${id} not found`);
      }

      this.logger.log(`✅ Service Provider found: ${serviceProvider.businessName}`);

      // If email is being updated, check for duplicates (excluding current SP)
      if (updateDto.email && updateDto.email !== serviceProvider.email) {
        this.logger.log(`📧 Checking email uniqueness: ${updateDto.email}`);
        const existingEmail = await this.serviceProviderRepository.findOne({
          where: {
            email: updateDto.email,
            id: Not(id), // Exclude current service provider from the check
          },
        });

        if (existingEmail) {
          this.logger.error(`❌ Email already in use: ${updateDto.email}`);
          throw new ConflictException('Email already in use by another service provider');
        }
        this.logger.log(`✅ Email is unique`);
      }

      // If registration number is being updated, check for duplicates (excluding current SP)
      if (updateDto.registrationNumber && updateDto.registrationNumber !== serviceProvider.registrationNumber) {
        this.logger.log(`📋 Checking registration number uniqueness: ${updateDto.registrationNumber}`);
        const existingRegNumber = await this.serviceProviderRepository.findOne({
          where: {
            registrationNumber: updateDto.registrationNumber,
            id: Not(id),
          },
        });

        if (existingRegNumber) {
          this.logger.error(`❌ Registration number already in use: ${updateDto.registrationNumber}`);
          throw new ConflictException('Business registration number already in use by another service provider');
        }
        this.logger.log(`✅ Registration number is unique`);
      }

      // If TIN number is being updated, check for duplicates (excluding current SP)
      if (updateDto.tinNumber && updateDto.tinNumber !== serviceProvider.tinNumber) {
        this.logger.log(`🔢 Checking TIN number uniqueness: ${updateDto.tinNumber}`);
        const existingTin = await this.serviceProviderRepository.findOne({
          where: {
            tinNumber: updateDto.tinNumber,
            id: Not(id),
          },
        });

        if (existingTin) {
          this.logger.error(`❌ TIN number already in use: ${updateDto.tinNumber}`);
          throw new ConflictException('TIN number already in use by another service provider');
        }
        this.logger.log(`✅ TIN number is unique`);
      }

      // Update main entity fields
      this.logger.log(`📝 Updating main entity fields...`);
      Object.assign(serviceProvider, {
        businessName: updateDto.businessName,
        businessType: updateDto.businessType,
        otherBusinessType: updateDto.otherBusinessType,
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
      this.logger.log(`✅ Main fields updated`);

      // Save main entity FIRST to avoid cascade issues
      this.logger.log(`💾 Saving main service provider entity...`);
      await this.serviceProviderRepository.save(serviceProvider);
      this.logger.log(`✅ Service provider saved successfully`);

      // Update contact if provided
      if (updateDto.contact) {
        this.logger.log(`👤 Updating contact information...`);
        const existingContact = await this.contactRepository.findOne({
          where: { serviceProviderId: id },
        });

        if (existingContact) {
          this.logger.log(`📝 Contact found, updating: ${existingContact.id}`);
          Object.assign(existingContact, updateDto.contact);
          await this.contactRepository.save(existingContact);
          this.logger.log(`✅ Contact updated successfully`);
        } else {
          this.logger.warn(`⚠️ No existing contact found for SP: ${id}`);
        }
      }

      // Update bank accounts if provided (replaces all existing accounts)
      if (updateDto.bankAccounts && updateDto.bankAccounts.length > 0) {
        this.logger.log(`🏦 Updating bank accounts (${updateDto.bankAccounts.length} accounts)...`);

        // Delete all existing bank accounts
        this.logger.log(`🗑️ Deleting existing bank accounts...`);
        await this.bankAccountRepository.delete({ serviceProviderId: id });
        this.logger.log(`✅ Existing accounts deleted`);

        // Create new bank accounts (same pattern as in create method)
        this.logger.log(`➕ Creating new bank accounts...`);
        const bankAccounts = updateDto.bankAccounts.map((account) =>
          this.bankAccountRepository.create({
            ...account,
            serviceProviderId: id,
          }),
        );

        this.logger.debug(`Bank accounts to save: ${bankAccounts.length} accounts`);
        await this.bankAccountRepository.save(bankAccounts);
        this.logger.log(`✅ Bank accounts created successfully`);
      }

      // Update settings if provided
      if (updateDto.settings) {
        this.logger.log(`⚙️ Updating settings...`);
        const existingSettings = await this.settingsRepository.findOne({
          where: { serviceProviderId: id },
        });

        if (existingSettings) {
          // Merge existing with incoming to validate the final state
          const mergedSettings = {
            emailNotifications: existingSettings.emailNotifications,
            smsNotifications: existingSettings.smsNotifications,
            webhookEnabled: existingSettings.webhookEnabled,
            webhookUrl: existingSettings.webhookUrl,
            ...updateDto.settings,
          };
          this.validateNotificationSettings(mergedSettings);

          this.logger.log(`📝 Settings found, updating: ${existingSettings.id}`);
          Object.assign(existingSettings, updateDto.settings);
          await this.settingsRepository.save(existingSettings);
          this.logger.log(`✅ Settings updated successfully`);
        } else {
          this.logger.warn(`⚠️ No existing settings found for SP: ${id}`);
        }
      }

      this.logger.log(`📤 Fetching updated service provider with relations...`);
      const result = await this.findOne(id);
      this.logger.log(`✅ Update completed successfully for: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error updating service provider ${id}:`, error.stack);
      throw error;
    }
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

    // Create user account for the service provider with randomly generated password
    try {
      // Check if user already exists
      const existingUser = await this.userService.findByEmail(serviceProvider.email);

      if (!existingUser) {
        this.logger.log(`Creating user account for SP: ${serviceProvider.email}`);

        // Get contact person name from contact
        const contact = serviceProvider.contact;
        const firstName = contact?.fullName?.split(' ')[0] || 'Service';
        const lastName = contact?.fullName?.split(' ').slice(1).join(' ') || 'Provider';

        // Generate secure random password for this service provider
        const randomPassword = this.generateSecurePassword();

        // Create user with randomly generated password
        await this.userService.create({
          firstName,
          lastName,
          email: serviceProvider.email,
          phoneNumber: serviceProvider.phoneNumber,
          password: randomPassword,
          userType: UserType.SERVICE_PROVIDER,
          role: UserRole.SP_ADMIN,
          status: 'ACTIVE' as any,
        });

        // Mark user as must change password
        const newUser = await this.userService.findByEmail(serviceProvider.email);
        if (newUser) {
          await this.userService.update(newUser.id, {
            mustChangePassword: true,
          } as any);
        }

        this.logger.log(`User account created successfully for SP: ${serviceProvider.email}`);

        // Send randomly generated password via SMS
        await this.notificationService.sendSMS(
          serviceProvider.phoneNumber,
          `Welcome to UCG! Your account has been created.\n\nEmail: ${serviceProvider.email}\nTemporary Password: ${randomPassword}\n\nIMPORTANT: You must change this password on first login.\n\nLogin at: https://sp.ucg.co.tz`,
          'UCG - Account Created',
        );
        this.logger.log(`Temporary password sent via SMS to: ${serviceProvider.phoneNumber}`);
      } else {
        this.logger.warn(`User already exists for SP: ${serviceProvider.email}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create user account for SP: ${error.message}`);
      // Continue with approval even if user creation fails
    }

    // Send approval notification
    try {
      await this.notificationService.notifyServiceProviderApproval(
        serviceProvider.email,
        serviceProvider.phoneNumber,
        serviceProvider.businessName,
        serviceProvider.apiKey,
      );
    } catch (error) {
      this.logger.error(`Failed to send approval notification: ${error.message}`);
    }

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

    // Send rejection notification
    try {
      await this.notificationService.notifyServiceProviderRejection(
        serviceProvider.email,
        serviceProvider.phoneNumber,
        serviceProvider.businessName,
        rejectionReason,
      );
    } catch (error) {
      this.logger.error(`Failed to send rejection notification: ${error.message}`);
    }

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

  // ==================== Bank Account Management ====================

  /**
   * Get all bank accounts for a service provider
   */
  async getBankAccounts(
    serviceProviderId: string,
  ): Promise<ServiceProviderBankAccount[]> {
    // Verify SP exists
    await this.findOne(serviceProviderId);

    return await this.bankAccountRepository.find({
      where: { serviceProviderId },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
  }

  /**
   * Get a single bank account by ID
   */
  async getBankAccount(
    serviceProviderId: string,
    accountId: string,
  ): Promise<ServiceProviderBankAccount> {
    // Verify SP exists
    await this.findOne(serviceProviderId);

    const account = await this.bankAccountRepository.findOne({
      where: { id: accountId, serviceProviderId },
    });

    if (!account) {
      throw new NotFoundException(
        `Bank account with ID ${accountId} not found for this service provider`,
      );
    }

    return account;
  }

  /**
   * Add a new bank account to a service provider
   */
  async addBankAccount(
    serviceProviderId: string,
    createDto: CreateBankAccountDto,
  ): Promise<ServiceProviderBankAccount> {
    // Verify SP exists
    await this.findOne(serviceProviderId);

    // Check if account number already exists for this service provider
    const existingAccount = await this.bankAccountRepository.findOne({
      where: {
        serviceProviderId,
        accountNumber: createDto.accountNumber,
      },
    });

    if (existingAccount) {
      throw new ConflictException('Bank account number already exists for this service provider');
    }

    // If this is marked as primary, unset other primary accounts
    if (createDto.isPrimary) {
      await this.bankAccountRepository.update(
        { serviceProviderId, isPrimary: true },
        { isPrimary: false },
      );
    }

    // Check if this is the first account, make it primary
    const existingCount = await this.bankAccountRepository.count({
      where: { serviceProviderId },
    });

    const account = this.bankAccountRepository.create({
      ...createDto,
      serviceProviderId,
      isPrimary: createDto.isPrimary ?? existingCount === 0,
    });

    return await this.bankAccountRepository.save(account);
  }

  /**
   * Update a bank account
   */
  async updateBankAccount(
    serviceProviderId: string,
    accountId: string,
    updateDto: UpdateBankAccountDto,
  ): Promise<ServiceProviderBankAccount> {
    const account = await this.getBankAccount(serviceProviderId, accountId);

    // If account number is being updated, check for duplicates (excluding current account)
    if (updateDto.accountNumber && updateDto.accountNumber !== account.accountNumber) {
      const existingAccount = await this.bankAccountRepository.findOne({
        where: {
          serviceProviderId,
          accountNumber: updateDto.accountNumber,
          id: Not(accountId), // Exclude current account from the check
        },
      });

      if (existingAccount) {
        throw new ConflictException('Bank account number already exists for this service provider');
      }
    }

    // If setting as primary, unset other primary accounts
    if (updateDto.isPrimary === true) {
      await this.bankAccountRepository.update(
        { serviceProviderId, isPrimary: true, id: Not(accountId) },
        { isPrimary: false },
      );
    }

    Object.assign(account, updateDto);

    return await this.bankAccountRepository.save(account);
  }

  /**
   * Set a bank account as primary
   */
  async setPrimaryBankAccount(
    serviceProviderId: string,
    accountId: string,
  ): Promise<ServiceProviderBankAccount> {
    const account = await this.getBankAccount(serviceProviderId, accountId);

    // Unset all other primary accounts
    await this.bankAccountRepository.update(
      { serviceProviderId, isPrimary: true },
      { isPrimary: false },
    );

    account.isPrimary = true;

    return await this.bankAccountRepository.save(account);
  }

  /**
   * Delete a bank account (soft delete - deactivate)
   */
  async deleteBankAccount(
    serviceProviderId: string,
    accountId: string,
  ): Promise<void> {
    const account = await this.getBankAccount(serviceProviderId, accountId);

    // Prevent deletion of primary account if it's the only active one
    if (account.isPrimary) {
      const activeCount = await this.bankAccountRepository.count({
        where: { serviceProviderId, isActive: true },
      });

      if (activeCount === 1) {
        throw new BadRequestException(
          'Cannot delete the only active bank account. Add another account first.',
        );
      }

      // If deleting primary, set another active account as primary
      const newPrimary = await this.bankAccountRepository.findOne({
        where: {
          serviceProviderId,
          isActive: true,
          id: Not(accountId),
        },
      });

      if (newPrimary) {
        newPrimary.isPrimary = true;
        await this.bankAccountRepository.save(newPrimary);
      }
    }

    account.isActive = false;
    await this.bankAccountRepository.save(account);
  }
}
