# POJO Patterns - Quick Reference Guide

## What You're Currently Using ✅

Your UCG backend follows **standard POJO-equivalent patterns** for TypeScript/NestJS:

### 1. Entity Pattern (Database POJOs)
**Java Equivalent**: JPA Entities with `@Entity`, `@Table`, `@Column`

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

  // Relationships (like JPA @OneToOne, @OneToMany)
  @OneToOne(() => ServiceProviderContact, { cascade: true })
  contact: ServiceProviderContact;

  @OneToMany(() => ServiceProviderBankAccount, { cascade: true })
  bankAccounts: ServiceProviderBankAccount[];
}
```

### 2. DTO Pattern (Data Transfer Objects)
**Java Equivalent**: DTOs with Bean Validation annotations

```typescript
// dto/create-service-provider.dto.ts
export class CreateServiceProviderDto {
  @ApiProperty({ description: 'Business name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  businessName: string;

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

### 3. Repository Pattern
**Java Equivalent**: Spring Data JPA `JpaRepository<Entity, ID>`

```typescript
// In service
constructor(
  @InjectRepository(ServiceProvider)
  private readonly serviceProviderRepository: Repository<ServiceProvider>,
) {}

// Usage (like Spring Data methods)
async findAll() {
  return this.serviceProviderRepository.find();
}

async findOne(id: string) {
  return this.serviceProviderRepository.findOne({ where: { id } });
}
```

### 4. Service Layer Pattern
**Java Equivalent**: Spring `@Service` classes

```typescript
// service-provider.service.ts
@Injectable()
export class ServiceProviderService {
  constructor(
    @InjectRepository(ServiceProvider)
    private readonly repository: Repository<ServiceProvider>,
  ) {}

  async create(dto: CreateServiceProviderDto): Promise<ServiceProvider> {
    // Business logic here
    const entity = this.repository.create(dto);
    return await this.repository.save(entity);
  }

  async findAll(): Promise<ServiceProvider[]> {
    return await this.repository.find();
  }
}
```

### 5. Controller Pattern
**Java Equivalent**: Spring `@RestController` with `@RequestMapping`

```typescript
// service-provider.controller.ts
@ApiTags('Service Providers')
@Controller('service-providers')
export class ServiceProviderController {
  constructor(private readonly service: ServiceProviderService) {}

  @Post()
  @ApiOperation({ summary: 'Register new service provider' })
  async create(@Body() dto: CreateServiceProviderDto) {
    return await this.service.create(dto);
  }

  @Get()
  async findAll(@Query() query: QueryServiceProviderDto) {
    return await this.service.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }
}
```

---

## Java vs TypeScript Pattern Comparison

| Pattern | Java (Spring Boot) | TypeScript (NestJS) | Status in UCG |
|---------|-------------------|---------------------|---------------|
| **Entity** | `@Entity` (JPA) | `@Entity` (TypeORM) | ✅ Implemented |
| **DTO** | Bean Validation | `class-validator` | ✅ Implemented |
| **Repository** | `JpaRepository<T, ID>` | `Repository<T>` | ✅ Implemented |
| **Service** | `@Service` | `@Injectable()` | ✅ Implemented |
| **Controller** | `@RestController` | `@Controller()` | ✅ Implemented |
| **Dependency Injection** | `@Autowired` | Constructor injection | ✅ Implemented |
| **Validation** | `@Valid` | ValidationPipe | ✅ Implemented |
| **Mapping** | MapStruct / ModelMapper | Mapper class | ⚠️ Optional |
| **Builder** | Lombok `@Builder` | Builder class | ⚠️ Optional |

---

## Current Architecture Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────────────────┐
│  Controller Layer                │  ← @Controller (like @RestController)
│  - Handles HTTP requests         │
│  - Validates input with DTOs     │
│  - Returns responses             │
└──────────────┬──────────────────┘
               │ Calls service
               ▼
┌─────────────────────────────────┐
│  Service Layer                   │  ← @Injectable (like @Service)
│  - Business logic                │
│  - Transaction management        │
│  - Orchestrates repositories     │
└──────────────┬──────────────────┘
               │ Uses repositories
               ▼
┌─────────────────────────────────┐
│  Repository Layer                │  ← TypeORM Repository (like JpaRepository)
│  - Data access                   │
│  - CRUD operations               │
│  - Query building                │
└──────────────┬──────────────────┘
               │ Queries/Saves
               ▼
┌─────────────────────────────────┐
│  Database (PostgreSQL)           │
│  - service_providers             │
│  - service_provider_contacts     │
│  - service_provider_bank_accounts│
│  - service_provider_settings     │
└─────────────────────────────────┘
```

---

## Your Current Implementation Summary

### ✅ What's Working Well

1. **Normalized Database** - 4 related tables following 3NF
2. **Type Safety** - Full TypeScript with decorators
3. **Validation** - Automatic input validation with `class-validator`
4. **Documentation** - Swagger/OpenAPI auto-generation
5. **Relationships** - TypeORM handles 1:1 and 1:N relationships
6. **Cascade Operations** - Auto-save/delete related entities
7. **Separation of Concerns** - Controller → Service → Repository

### ⚠️ Optional Enhancements

Consider adding these patterns as your application grows:

1. **Mapper Pattern** - Transform entities to DTOs (hide sensitive data)
2. **Factory Pattern** - Create complex objects
3. **Value Objects** - Domain concepts (SpCode, Money, etc.)
4. **Specifications** - Reusable query logic
5. **Interceptors** - Cross-cutting concerns (logging, caching)

---

## When to Use Each Pattern

### Use Current Patterns For:
- ✅ Simple CRUD operations
- ✅ Basic business logic
- ✅ Standard validation
- ✅ Database operations
- ✅ API endpoints

### Add Mapper Pattern When:
- 🔒 Need to hide sensitive data (account numbers, API keys)
- 📝 Want different response formats (public vs admin)
- 🔄 Entity structure differs from API response

### Add Factory Pattern When:
- 🏗️ Object creation is complex
- 🧪 Need consistent defaults
- 🔄 Multiple ways to create objects

### Add Value Objects When:
- 💎 Have domain concepts with validation (SpCode, PhoneNumber)
- 🔒 Need immutability
- ✔️ Encapsulate business rules

---

## Example: Using Mapper (Optional)

If you want to mask sensitive data or transform responses:

```typescript
// 1. Import mapper in controller
import { ServiceProviderMapper } from '../../common/mappers/service-provider.mapper';

// 2. Use in controller methods
@Get(':id')
async findOne(@Param('id') id: string) {
  const entity = await this.service.findOne(id);
  return ServiceProviderMapper.toResponseDto(entity); // Transform entity to DTO
}

// 3. For public endpoints, mask sensitive data
@Get('public/:id')
async findOnePublic(@Param('id') id: string) {
  const entity = await this.service.findOne(id);
  return ServiceProviderMapper.toPublicResponseDto(entity); // Masks account numbers, hides API key
}
```

**Benefits:**
- ✅ Mask account numbers: `0150123456789` → `0150****56789`
- ✅ Hide API keys from public responses
- ✅ Control exactly what data is returned
- ✅ Different responses for admin vs public

---

## Code Organization

Your current structure follows POJO principles:

```
src/modules/service-provider/
├── entities/                    ← POJOs (like Java entities)
│   ├── service-provider.entity.ts
│   ├── service-provider-contact.entity.ts
│   ├── service-provider-bank-account.entity.ts
│   └── service-provider-settings.entity.ts
│
├── dto/                         ← POJOs (like Java DTOs)
│   ├── create-service-provider.dto.ts
│   ├── update-service-provider.dto.ts
│   ├── contact.dto.ts
│   ├── bank-account.dto.ts
│   └── settings.dto.ts
│
├── service-provider.service.ts  ← Business logic (like @Service)
├── service-provider.controller.ts  ← REST endpoints (like @RestController)
└── service-provider.module.ts   ← Module config (like @Configuration)
```

---

## Summary

### ✅ You're Already Following POJO Patterns!

Your implementation follows the **same patterns as Java/Spring Boot**:
- Entities = JPA Entities
- DTOs = Bean Validation DTOs
- Services = @Service classes
- Controllers = @RestController classes
- Repositories = Spring Data repositories

### 📚 Documentation

- **Full Pattern Guide**: See [DESIGN_PATTERNS.md](./DESIGN_PATTERNS.md)
- **Database Schema**: See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- **Normalization**: See [NORMALIZATION_SUMMARY.md](./NORMALIZATION_SUMMARY.md)

### 🚀 Ready to Use

Your current implementation is **production-ready** and follows industry best practices. The optional patterns (Mapper, Factory, etc.) can be added later as needed.

---

**TL;DR**: Your NestJS/TypeScript code is the equivalent of clean Java POJOs with Spring Boot. You're following all the right patterns! 🎯
