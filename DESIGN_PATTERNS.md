# Design Patterns for UCG Backend

This document outlines the design patterns and POJO-like structures used in the UCG implementation.

## 1. Core Patterns (Currently Implemented)

### 1.1 Entity Pattern (Domain Models)
**Similar to**: Java JPA Entities / POJOs with Hibernate annotations

**Purpose**: Represent database tables as TypeScript classes

```typescript
// entities/service-provider.entity.ts
@Entity('service_providers')
export class ServiceProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  businessName: string;

  @Column({ type: 'enum', enum: ServiceProviderType })
  businessType: ServiceProviderType;

  // Relationships
  @OneToOne(() => ServiceProviderContact, (contact) => contact.serviceProvider, {
    cascade: true,
    eager: true,
  })
  contact: ServiceProviderContact;

  @OneToMany(() => ServiceProviderBankAccount, (account) => account.serviceProvider, {
    cascade: true,
    eager: true,
  })
  bankAccounts: ServiceProviderBankAccount[];
}
```

**Benefits**:
- Clean mapping to database
- Type safety
- Automatic serialization
- Relationship management

---

### 1.2 DTO Pattern (Data Transfer Objects)
**Similar to**: Java DTOs with Bean Validation

**Purpose**: Define request/response structure with validation

```typescript
// dto/create-service-provider.dto.ts
export class CreateServiceProviderDto {
  @ApiProperty({ description: 'Business name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  businessName: string;

  @ApiProperty({ enum: ServiceProviderType })
  @IsEnum(ServiceProviderType)
  businessType: ServiceProviderType;

  @ApiProperty({ type: CreateContactDto })
  @ValidateNested()
  @Type(() => CreateContactDto)
  contact: CreateContactDto;

  @ApiProperty({ type: [CreateBankAccountDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBankAccountDto)
  bankAccounts: CreateBankAccountDto[];
}
```

**Benefits**:
- Input validation
- API documentation (Swagger)
- Type safety
- Nested object validation

---

### 1.3 Repository Pattern
**Similar to**: Spring Data JPA Repositories

**Purpose**: Data access abstraction (handled by TypeORM)

```typescript
// In service
@Injectable()
export class ServiceProviderService {
  constructor(
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
    @InjectRepository(ServiceProviderContact)
    private readonly contactRepository: Repository<ServiceProviderContact>,
    @InjectRepository(ServiceProviderBankAccount)
    private readonly bankAccountRepository: Repository<ServiceProviderBankAccount>,
  ) {}

  async findAll() {
    return this.serviceProviderRepository.find({
      relations: ['contact', 'bankAccounts', 'settings'],
    });
  }
}
```

---

### 1.4 Service Layer Pattern
**Similar to**: Spring @Service classes

**Purpose**: Business logic layer

```typescript
@Injectable()
export class ServiceProviderService {
  // Business logic methods
  async create(dto: CreateServiceProviderDto): Promise<ServiceProvider> {
    // Generate SP code
    const spCode = await this.generateSpCode(dto.businessName);

    // Create and save entity
    const serviceProvider = this.serviceProviderRepository.create({
      ...dto,
      spCode,
      status: OnboardingStatus.PENDING,
    });

    return await this.serviceProviderRepository.save(serviceProvider);
  }
}
```

---

### 1.5 Controller Pattern
**Similar to**: Spring @RestController

**Purpose**: Handle HTTP requests/responses

```typescript
@ApiTags('Service Providers')
@Controller('service-providers')
export class ServiceProviderController {
  constructor(private readonly serviceProviderService: ServiceProviderService) {}

  @Post()
  @ApiOperation({ summary: 'Register new service provider' })
  async create(@Body() dto: CreateServiceProviderDto) {
    return await this.serviceProviderService.create(dto);
  }

  @Get()
  async findAll(@Query() query: QueryServiceProviderDto) {
    return await this.serviceProviderService.findAll(query);
  }
}
```

---

## 2. Recommended Additional Patterns

### 2.1 Value Object Pattern
**Use For**: Immutable domain concepts

```typescript
// common/value-objects/sp-code.vo.ts
export class SpCode {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.length !== 3) {
      throw new Error('SP Code must be exactly 3 characters');
    }
    this.value = value.toUpperCase();
  }

  getValue(): string {
    return this.value;
  }

  equals(other: SpCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

// Usage in entity
@Entity()
export class ServiceProvider {
  @Column({ length: 3, unique: true, transformer: {
    to: (value: SpCode) => value.getValue(),
    from: (value: string) => new SpCode(value)
  }})
  spCode: SpCode;
}
```

**Benefits**:
- Encapsulates validation
- Immutable
- Type-safe operations

---

### 2.2 Mapper/Transformer Pattern
**Use For**: Converting between entities and DTOs

```typescript
// common/mappers/service-provider.mapper.ts
export class ServiceProviderMapper {
  static toResponseDto(entity: ServiceProvider): ServiceProviderResponseDto {
    return {
      id: entity.id,
      spCode: entity.spCode,
      businessName: entity.businessName,
      businessType: entity.businessType,
      status: entity.status,
      contact: entity.contact ? this.mapContact(entity.contact) : null,
      bankAccounts: entity.bankAccounts?.map(account => this.mapBankAccount(account)) || [],
      settings: entity.settings ? this.mapSettings(entity.settings) : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private static mapContact(contact: ServiceProviderContact): ContactResponseDto {
    return {
      id: contact.id,
      fullName: contact.fullName,
      phoneNumber: contact.phoneNumber,
      email: contact.email,
      position: contact.position,
    };
  }

  private static mapBankAccount(account: ServiceProviderBankAccount): BankAccountResponseDto {
    return {
      id: account.id,
      bankName: account.bankName,
      accountNumber: this.maskAccountNumber(account.accountNumber),
      accountName: account.accountName,
      isPrimary: account.isPrimary,
      isActive: account.isActive,
    };
  }

  private static maskAccountNumber(accountNumber: string): string {
    // Mask middle digits: 0150123456789 -> 0150****56789
    if (accountNumber.length < 8) return accountNumber;
    const start = accountNumber.substring(0, 4);
    const end = accountNumber.substring(accountNumber.length - 5);
    return `${start}****${end}`;
  }

  static toEntity(dto: CreateServiceProviderDto): ServiceProvider {
    const entity = new ServiceProvider();
    entity.businessName = dto.businessName;
    entity.businessType = dto.businessType;
    entity.email = dto.email;
    // ... map other fields
    return entity;
  }
}

// Usage in controller
@Get(':id')
async findOne(@Param('id') id: string) {
  const entity = await this.serviceProviderService.findOne(id);
  return ServiceProviderMapper.toResponseDto(entity);
}
```

**Benefits**:
- Separation of concerns
- Can mask sensitive data
- Consistent transformation logic

---

### 2.3 Builder Pattern
**Use For**: Complex object creation

```typescript
// common/builders/service-provider.builder.ts
export class ServiceProviderBuilder {
  private serviceProvider: ServiceProvider;

  constructor() {
    this.serviceProvider = new ServiceProvider();
    // Set defaults
    this.serviceProvider.status = OnboardingStatus.PENDING;
    this.serviceProvider.isActive = false;
  }

  withBusinessInfo(name: string, type: ServiceProviderType): this {
    this.serviceProvider.businessName = name;
    this.serviceProvider.businessType = type;
    return this;
  }

  withRegistration(registrationNumber: string, tinNumber: string): this {
    this.serviceProvider.registrationNumber = registrationNumber;
    this.serviceProvider.tinNumber = tinNumber;
    return this;
  }

  withContactInfo(phone: string, email: string, address?: string): this {
    this.serviceProvider.phoneNumber = phone;
    this.serviceProvider.email = email;
    this.serviceProvider.physicalAddress = address;
    return this;
  }

  withSpCode(spCode: string): this {
    this.serviceProvider.spCode = spCode;
    return this;
  }

  withStatus(status: OnboardingStatus): this {
    this.serviceProvider.status = status;
    return this;
  }

  build(): ServiceProvider {
    // Validate before building
    if (!this.serviceProvider.businessName) {
      throw new Error('Business name is required');
    }
    if (!this.serviceProvider.email) {
      throw new Error('Email is required');
    }
    return this.serviceProvider;
  }
}

// Usage in service
async create(dto: CreateServiceProviderDto): Promise<ServiceProvider> {
  const spCode = await this.generateSpCode(dto.businessName);

  const serviceProvider = new ServiceProviderBuilder()
    .withBusinessInfo(dto.businessName, dto.businessType)
    .withRegistration(dto.registrationNumber, dto.tinNumber)
    .withContactInfo(dto.phoneNumber, dto.email, dto.physicalAddress)
    .withSpCode(spCode)
    .build();

  return await this.serviceProviderRepository.save(serviceProvider);
}
```

**Benefits**:
- Fluent API
- Immutable during construction
- Validation before building

---

### 2.4 Specification Pattern
**Use For**: Complex query logic

```typescript
// common/specifications/service-provider.specification.ts
export interface Specification<T> {
  isSatisfiedBy(entity: T): boolean;
  toQueryBuilder(qb: SelectQueryBuilder<T>): SelectQueryBuilder<T>;
}

export class ApprovedServiceProviderSpec implements Specification<ServiceProvider> {
  isSatisfiedBy(entity: ServiceProvider): boolean {
    return entity.status === OnboardingStatus.APPROVED && entity.isActive;
  }

  toQueryBuilder(qb: SelectQueryBuilder<ServiceProvider>): SelectQueryBuilder<ServiceProvider> {
    return qb
      .where('sp.status = :status', { status: OnboardingStatus.APPROVED })
      .andWhere('sp.isActive = :active', { active: true });
  }
}

export class VerifiedServiceProviderSpec implements Specification<ServiceProvider> {
  isSatisfiedBy(entity: ServiceProvider): boolean {
    return entity.nidaVerified && entity.brelaVerified && entity.traVerified;
  }

  toQueryBuilder(qb: SelectQueryBuilder<ServiceProvider>): SelectQueryBuilder<ServiceProvider> {
    return qb
      .where('sp.nidaVerified = :nida', { nida: true })
      .andWhere('sp.brelaVerified = :brela', { brela: true })
      .andWhere('sp.traVerified = :tra', { tra: true });
  }
}

export class CompositeSpecification<T> implements Specification<T> {
  constructor(private specs: Specification<T>[]) {}

  isSatisfiedBy(entity: T): boolean {
    return this.specs.every(spec => spec.isSatisfiedBy(entity));
  }

  toQueryBuilder(qb: SelectQueryBuilder<T>): SelectQueryBuilder<T> {
    return this.specs.reduce((query, spec) => spec.toQueryBuilder(query), qb);
  }
}

// Usage in service
async findFullyVerifiedAndApproved(): Promise<ServiceProvider[]> {
  const spec = new CompositeSpecification([
    new ApprovedServiceProviderSpec(),
    new VerifiedServiceProviderSpec(),
  ]);

  const qb = this.serviceProviderRepository.createQueryBuilder('sp');
  return spec.toQueryBuilder(qb).getMany();
}
```

**Benefits**:
- Reusable query logic
- Composable specifications
- Testable in isolation

---

### 2.5 Factory Pattern
**Use For**: Creating complex objects with dependencies

```typescript
// common/factories/service-provider.factory.ts
@Injectable()
export class ServiceProviderFactory {
  constructor(
    private readonly spCodeGenerator: SpCodeGenerator,
    private readonly apiKeyGenerator: ApiKeyGenerator,
  ) {}

  async createNew(dto: CreateServiceProviderDto): Promise<ServiceProvider> {
    const serviceProvider = new ServiceProvider();

    // Generate unique identifiers
    serviceProvider.spCode = await this.spCodeGenerator.generate(dto.businessName);

    // Set business information
    serviceProvider.businessName = dto.businessName;
    serviceProvider.businessType = dto.businessType;
    serviceProvider.registrationNumber = dto.registrationNumber;
    serviceProvider.tinNumber = dto.tinNumber;
    serviceProvider.phoneNumber = dto.phoneNumber;
    serviceProvider.email = dto.email;
    serviceProvider.physicalAddress = dto.physicalAddress;
    serviceProvider.region = dto.region;
    serviceProvider.district = dto.district;

    // Set initial state
    serviceProvider.status = OnboardingStatus.PENDING;
    serviceProvider.isActive = false;

    return serviceProvider;
  }

  async createContact(
    dto: CreateContactDto,
    serviceProviderId: string,
  ): Promise<ServiceProviderContact> {
    const contact = new ServiceProviderContact();
    contact.serviceProviderId = serviceProviderId;
    contact.fullName = dto.fullName;
    contact.phoneNumber = dto.phoneNumber;
    contact.email = dto.email;
    contact.idNumber = dto.idNumber;
    contact.position = dto.position;
    contact.isPrimary = true;
    return contact;
  }

  async createBankAccounts(
    dtos: CreateBankAccountDto[],
    serviceProviderId: string,
  ): Promise<ServiceProviderBankAccount[]> {
    return dtos.map((dto, index) => {
      const account = new ServiceProviderBankAccount();
      account.serviceProviderId = serviceProviderId;
      account.bankName = dto.bankName;
      account.accountNumber = dto.accountNumber;
      account.accountName = dto.accountName;
      account.swiftCode = dto.swiftCode;
      account.branchName = dto.branchName;
      account.branchCode = dto.branchCode;
      account.accountType = dto.accountType || 'SAVINGS';
      account.isPrimary = dto.isPrimary || index === 0; // First account is primary by default
      account.isActive = true;
      return account;
    });
  }

  createDefaultSettings(serviceProviderId: string): ServiceProviderSettings {
    const settings = new ServiceProviderSettings();
    settings.serviceProviderId = serviceProviderId;
    settings.commissionRate = 0;
    settings.settlementFrequency = SettlementFrequency.DAILY;
    settings.autoSettlement = true;
    settings.minimumSettlementAmount = 0;
    settings.webhookEnabled = false;
    settings.emailNotifications = true;
    settings.smsNotifications = true;
    settings.pushNotifications = false;
    settings.apiRateLimit = 100;
    settings.apiEnabled = true;
    return settings;
  }
}

// Usage in service
@Injectable()
export class ServiceProviderService {
  constructor(
    private readonly factory: ServiceProviderFactory,
    // repositories...
  ) {}

  async create(dto: CreateServiceProviderDto): Promise<ServiceProvider> {
    // Use factory to create entities
    const serviceProvider = await this.factory.createNew(dto);
    const savedSp = await this.serviceProviderRepository.save(serviceProvider);

    const contact = await this.factory.createContact(dto.contact, savedSp.id);
    await this.contactRepository.save(contact);

    const bankAccounts = await this.factory.createBankAccounts(dto.bankAccounts, savedSp.id);
    await this.bankAccountRepository.save(bankAccounts);

    const settings = dto.settings
      ? Object.assign(this.factory.createDefaultSettings(savedSp.id), dto.settings)
      : this.factory.createDefaultSettings(savedSp.id);
    await this.settingsRepository.save(settings);

    return this.findOne(savedSp.id);
  }
}
```

**Benefits**:
- Centralized object creation
- Consistent defaults
- Testable in isolation

---

### 2.6 Strategy Pattern
**Use For**: Different algorithms for the same task

```typescript
// common/strategies/sp-code-generation.strategy.ts
export interface SpCodeGenerationStrategy {
  generate(businessName: string, existingCodes: string[]): string;
}

export class PrefixBasedStrategy implements SpCodeGenerationStrategy {
  generate(businessName: string, existingCodes: string[]): string {
    const prefix = businessName
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase();

    let code = prefix;
    let counter = 0;

    while (existingCodes.includes(code)) {
      counter++;
      code = prefix.substring(0, 2) + counter.toString();
    }

    return code;
  }
}

export class RandomStrategy implements SpCodeGenerationStrategy {
  generate(businessName: string, existingCodes: string[]): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;

    do {
      code = Array.from({ length: 3 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('');
    } while (existingCodes.includes(code));

    return code;
  }
}

export class SequentialStrategy implements SpCodeGenerationStrategy {
  generate(businessName: string, existingCodes: string[]): string {
    // SP001, SP002, SP003...
    const maxNumber = existingCodes
      .map(code => parseInt(code.replace('SP', '')))
      .reduce((max, num) => Math.max(max, num), 0);

    return `SP${(maxNumber + 1).toString().padStart(3, '0')}`;
  }
}

// Service
@Injectable()
export class SpCodeGenerator {
  private strategy: SpCodeGenerationStrategy;

  constructor() {
    // Default strategy
    this.strategy = new PrefixBasedStrategy();
  }

  setStrategy(strategy: SpCodeGenerationStrategy) {
    this.strategy = strategy;
  }

  async generate(businessName: string): Promise<string> {
    const existingCodes = await this.getAllExistingCodes();
    return this.strategy.generate(businessName, existingCodes);
  }

  private async getAllExistingCodes(): Promise<string[]> {
    // Query database for all SP codes
    return [];
  }
}
```

**Benefits**:
- Easy to swap algorithms
- Open for extension
- Testable strategies

---

## 3. Directory Structure for Patterns

```
src/
├── common/
│   ├── builders/
│   │   └── service-provider.builder.ts
│   ├── factories/
│   │   └── service-provider.factory.ts
│   ├── mappers/
│   │   └── service-provider.mapper.ts
│   ├── specifications/
│   │   └── service-provider.specification.ts
│   ├── strategies/
│   │   └── sp-code-generation.strategy.ts
│   └── value-objects/
│       └── sp-code.vo.ts
├── modules/
│   └── service-provider/
│       ├── dto/
│       ├── entities/
│       ├── service-provider.controller.ts
│       ├── service-provider.service.ts
│       └── service-provider.module.ts
└── main.ts
```

---

## 4. Recommended Implementation Order

### Phase 1: Basic Patterns (Already Done ✅)
- [x] Entity Pattern
- [x] DTO Pattern
- [x] Repository Pattern
- [x] Service Pattern
- [x] Controller Pattern

### Phase 2: Essential Enhancements
- [ ] Mapper Pattern (for response transformation)
- [ ] Factory Pattern (for complex object creation)

### Phase 3: Advanced Patterns
- [ ] Value Object Pattern (for SP Code, Phone Number, etc.)
- [ ] Specification Pattern (for complex queries)
- [ ] Strategy Pattern (for different business rules)
- [ ] Builder Pattern (for test data)

---

## 5. Java vs TypeScript Comparison

| Pattern | Java | TypeScript/NestJS |
|---------|------|-------------------|
| **Entity** | `@Entity` + JPA | `@Entity` + TypeORM |
| **DTO** | Bean Validation | `class-validator` |
| **Repository** | Spring Data JPA | TypeORM Repository |
| **Service** | `@Service` | `@Injectable()` |
| **Controller** | `@RestController` | `@Controller()` |
| **Dependency Injection** | `@Autowired` | Constructor injection |
| **Validation** | `@Valid` | `@Body()` + ValidationPipe |

---

## 6. Best Practices

### DO ✅
- Use DTOs for all API inputs/outputs
- Validate all inputs with decorators
- Use factories for complex object creation
- Map entities to DTOs before returning
- Keep business logic in services
- Use specifications for complex queries

### DON'T ❌
- Don't return entities directly from controllers
- Don't put business logic in controllers
- Don't use entities as DTOs
- Don't expose internal IDs in DTOs (use UUID or mask)
- Don't skip validation
- Don't mix concerns (controller logic in service, etc.)

---

## 7. Testing Patterns

```typescript
// service-provider.service.spec.ts
describe('ServiceProviderService', () => {
  let service: ServiceProviderService;
  let repository: Repository<ServiceProvider>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServiceProviderService,
        {
          provide: getRepositoryToken(ServiceProvider),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ServiceProviderService>(ServiceProviderService);
    repository = module.get<Repository<ServiceProvider>>(
      getRepositoryToken(ServiceProvider),
    );
  });

  it('should create a service provider', async () => {
    const dto = new CreateServiceProviderDto();
    // ... test implementation
  });
});
```

---

## Conclusion

The current implementation follows **standard POJO-like patterns** for TypeScript/NestJS:
- ✅ Entity Pattern (POJOs with decorators)
- ✅ DTO Pattern (data validation)
- ✅ Repository Pattern (data access)
- ✅ Service Pattern (business logic)
- ✅ Controller Pattern (API endpoints)

For production, consider adding:
- **Mapper Pattern** - Transform entities to DTOs
- **Factory Pattern** - Complex object creation
- **Value Object Pattern** - Domain concepts
- **Specification Pattern** - Query logic

These patterns provide clean, maintainable, testable code following SOLID principles.
