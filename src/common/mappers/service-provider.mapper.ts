import { ServiceProvider } from '../../modules/service-provider/entities/service-provider.entity';
import { ServiceProviderContact } from '../../modules/service-provider/entities/service-provider-contact.entity';
import { ServiceProviderBankAccount } from '../../modules/service-provider/entities/service-provider-bank-account.entity';
import { ServiceProviderSettings } from '../../modules/service-provider/entities/service-provider-settings.entity';
import {
  ServiceProviderResponseDto,
  ContactResponseDto,
  BankAccountResponseDto,
  SettingsResponseDto,
} from '../../modules/service-provider/dto/service-provider-response.dto';

/**
 * Mapper to transform entities to DTOs
 * Similar to Java MapStruct or ModelMapper
 */
export class ServiceProviderMapper {
  /**
   * Convert ServiceProvider entity to response DTO
   */
  static toResponseDto(entity: ServiceProvider): ServiceProviderResponseDto {
    if (!entity) {
      return null;
    }

    const dto = new ServiceProviderResponseDto();
    dto.id = entity.id;
    dto.spCode = entity.spCode;
    dto.businessName = entity.businessName;
    dto.businessType = entity.businessType;
    dto.registrationNumber = entity.registrationNumber;
    dto.tinNumber = entity.tinNumber;
    dto.phoneNumber = entity.phoneNumber;
    dto.email = entity.email;
    dto.physicalAddress = entity.physicalAddress;
    dto.region = entity.region;
    dto.district = entity.district;
    dto.status = entity.status;
    dto.nidaVerified = entity.nidaVerified;
    dto.brelaVerified = entity.brelaVerified;
    dto.traVerified = entity.traVerified;
    dto.isActive = entity.isActive;
    dto.apiKey = entity.apiKey;
    dto.spReferencePrefix = entity.spReferencePrefix;
    dto.referenceQueryUrl = entity.referenceQueryUrl;
    dto.hasOutboundApiKey = !!entity.outboundApiKey;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    // Map relationships
    dto.contact = entity.contact ? this.mapContact(entity.contact) : null;
    dto.bankAccounts = entity.bankAccounts?.map((account) =>
      this.mapBankAccount(account),
    ) || [];
    dto.settings = entity.settings ? this.mapSettings(entity.settings) : null;

    return dto;
  }

  /**
   * Convert contact entity to DTO
   */
  private static mapContact(contact: ServiceProviderContact): ContactResponseDto {
    const dto = new ContactResponseDto();
    dto.id = contact.id;
    dto.fullName = contact.fullName;
    dto.phoneNumber = contact.phoneNumber;
    dto.email = contact.email;
    dto.idNumber = contact.idNumber;
    dto.position = contact.position;
    return dto;
  }

  /**
   * Convert bank account entity to DTO
   * Optionally mask account number for security
   */
  private static mapBankAccount(
    account: ServiceProviderBankAccount,
    maskAccount = false,
  ): BankAccountResponseDto {
    const dto = new BankAccountResponseDto();
    dto.id = account.id;
    dto.bankName = account.bankName;
    dto.accountNumber = maskAccount
      ? this.maskAccountNumber(account.accountNumber)
      : account.accountNumber;
    dto.accountName = account.accountName;
    dto.swiftCode = account.swiftCode;
    dto.branchName = account.branchName;
    dto.accountType = account.accountType;
    dto.isPrimary = account.isPrimary;
    dto.isActive = account.isActive;
    return dto;
  }

  /**
   * Convert settings entity to DTO
   */
  private static mapSettings(settings: ServiceProviderSettings): SettingsResponseDto {
    const dto = new SettingsResponseDto();
    dto.id = settings.id;
    dto.commissionRate = settings.commissionRate;
    dto.settlementFrequency = settings.settlementFrequency;
    dto.autoSettlement = settings.autoSettlement;
    dto.minimumSettlementAmount = settings.minimumSettlementAmount;
    dto.webhookUrl = settings.webhookUrl;
    dto.webhookEnabled = settings.webhookEnabled;
    dto.emailNotifications = settings.emailNotifications;
    dto.smsNotifications = settings.smsNotifications;
    dto.dailyTransactionLimit = settings.dailyTransactionLimit;
    dto.apiRateLimit = settings.apiRateLimit;
    dto.apiEnabled = settings.apiEnabled;
    return dto;
  }

  /**
   * Mask account number for security
   * Example: 0150123456789 -> 0150****56789
   */
  private static maskAccountNumber(accountNumber: string): string {
    if (!accountNumber || accountNumber.length < 8) {
      return accountNumber;
    }

    const start = accountNumber.substring(0, 4);
    const end = accountNumber.substring(accountNumber.length - 5);
    const masked = '*'.repeat(Math.min(accountNumber.length - 9, 8));

    return `${start}${masked}${end}`;
  }

  /**
   * Convert array of entities to array of DTOs
   */
  static toResponseDtoArray(entities: ServiceProvider[]): ServiceProviderResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }

  /**
   * Convert to public response (mask sensitive data)
   */
  static toPublicResponseDto(entity: ServiceProvider): ServiceProviderResponseDto {
    const dto = this.toResponseDto(entity);

    // Mask sensitive information
    if (dto.bankAccounts) {
      dto.bankAccounts = entity.bankAccounts?.map((account) =>
        this.mapBankAccount(account, true),
      ) || [];
    }

    // Don't expose API key in public responses
    delete dto.apiKey;

    return dto;
  }
}
