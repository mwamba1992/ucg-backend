import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import {ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags,} from '@nestjs/swagger';
import {ServiceProviderService} from './service-provider.service';
import {CreateServiceProviderDto} from './dto/create-service-provider.dto';
import {UpdateServiceProviderDto} from './dto/update-service-provider.dto';
import {QueryServiceProviderDto} from './dto/query-service-provider.dto';
import {ServiceProviderResponseDto} from './dto/service-provider-response.dto';
import {CreateBankAccountDto} from './dto/bank-account.dto';
import {UpdateBankAccountDto} from './dto/update-bank-account.dto';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/roles.guard';
import {CurrentUser} from '../auth/decorators/current-user.decorator';
import {RequirePermissions} from '../auth/decorators/require-permissions.decorator';
import {User} from '../user/entities/user.entity';

@ApiTags('Service Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-providers')
export class ServiceProviderController {
  constructor(
    private readonly serviceProviderService: ServiceProviderService,
  ) {}

  @Post()
  @RequirePermissions('service-providers:create')
  @ApiOperation({ summary: 'Register a new service provider' })
  @ApiResponse({
    status: 201,
    description: 'Service provider successfully registered',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createDto: CreateServiceProviderDto) {
    return await this.serviceProviderService.create(createDto);
  }

  @Get()
  @RequirePermissions('service-providers:read')
  @ApiOperation({ summary: 'Get all service providers with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of service providers',
  })
  async findAll(@Query() query: QueryServiceProviderDto) {
    return await this.serviceProviderService.findAll(query);
  }

  @Get('statistics')
  @RequirePermissions('service-providers:read')
  @ApiOperation({ summary: 'Get service provider statistics' })
  @ApiResponse({
    status: 200,
    description: 'Service provider statistics',
  })
  async getStatistics() {
    return await this.serviceProviderService.getStatistics();
  }

  @Get(':id')
  @RequirePermissions('service-providers:read')
  @ApiOperation({ summary: 'Get service provider by ID' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'Service provider details',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async findOne(@Param('id') id: string) {
    return await this.serviceProviderService.findOne(id);
  }

  @Get('code/:spCode')
  @RequirePermissions('service-providers:read')
  @ApiOperation({ summary: 'Get service provider by SP code' })
  @ApiParam({ name: 'spCode', description: 'Service provider code (3 chars)' })
  @ApiResponse({
    status: 200,
    description: 'Service provider details',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async findBySpCode(@Param('spCode') spCode: string) {
    return await this.serviceProviderService.findBySpCode(spCode);
  }

  @Patch(':id')
  @RequirePermissions('service-providers:update')
  @ApiOperation({ summary: 'Update service provider details' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'Service provider updated successfully',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceProviderDto,
  ) {
    return await this.serviceProviderService.update(id, updateDto);
  }

  @Post(':id/approve')
  @RequirePermissions('service-providers:approve')
  @ApiOperation({ summary: 'Approve service provider onboarding' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'Service provider approved successfully',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  @ApiResponse({ status: 400, description: 'Already approved' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return await this.serviceProviderService.approve(id, user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('service-providers:reject')
  @ApiOperation({ summary: 'Reject service provider onboarding' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'Service provider rejected',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async reject(
    @Param('id') id: string,
    @Body('rejectionReason') rejectionReason: string,
  ) {
    return await this.serviceProviderService.reject(id, rejectionReason);
  }

  @Patch(':id/toggle-activation')
  @RequirePermissions('service-providers:update')
  @ApiOperation({ summary: 'Activate or deactivate service provider' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'Service provider activation toggled',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async toggleActivation(@Param('id') id: string) {
    return await this.serviceProviderService.toggleActivation(id);
  }

  @Delete(':id')
  @RequirePermissions('service-providers:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete service provider' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiResponse({
    status: 204,
    description: 'Service provider deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async remove(@Param('id') id: string) {
    await this.serviceProviderService.remove(id);
  }

  // ==================== Bank Account Endpoints ====================

  @Get(':id/bank-accounts')
  @RequirePermissions('service-providers:bank-accounts:read')
  @ApiOperation({ summary: 'Get all bank accounts for a service provider' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of bank accounts',
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async getBankAccounts(@Param('id') id: string) {
    return await this.serviceProviderService.getBankAccounts(id);
  }

  @Get(':id/bank-accounts/:accountId')
  @RequirePermissions('service-providers:bank-accounts:read')
  @ApiOperation({ summary: 'Get a specific bank account' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiParam({ name: 'accountId', description: 'Bank account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Bank account details',
  })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async getBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
  ) {
    return await this.serviceProviderService.getBankAccount(id, accountId);
  }

  @Post(':id/bank-accounts')
  @RequirePermissions('service-providers:bank-accounts:manage')
  @ApiOperation({ summary: 'Add a new bank account to a service provider' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiResponse({
    status: 201,
    description: 'Bank account added successfully',
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  async addBankAccount(
    @Param('id') id: string,
    @Body() createDto: CreateBankAccountDto,
  ) {
    return await this.serviceProviderService.addBankAccount(id, createDto);
  }

  @Patch(':id/bank-accounts/:accountId')
  @RequirePermissions('service-providers:bank-accounts:manage')
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiParam({ name: 'accountId', description: 'Bank account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Bank account updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async updateBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Body() updateDto: UpdateBankAccountDto,
  ) {
    return await this.serviceProviderService.updateBankAccount(
      id,
      accountId,
      updateDto,
    );
  }

  @Post(':id/bank-accounts/:accountId/set-primary')
  @RequirePermissions('service-providers:bank-accounts:manage')
  @ApiOperation({ summary: 'Set a bank account as primary' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiParam({ name: 'accountId', description: 'Bank account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Bank account set as primary',
  })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  async setPrimaryBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
  ) {
    return await this.serviceProviderService.setPrimaryBankAccount(
      id,
      accountId,
    );
  }

  @Delete(':id/bank-accounts/:accountId')
  @RequirePermissions('service-providers:bank-accounts:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete (deactivate) a bank account' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiParam({ name: 'accountId', description: 'Bank account UUID' })
  @ApiResponse({
    status: 204,
    description: 'Bank account deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete the only active bank account',
  })
  async deleteBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
  ) {
    await this.serviceProviderService.deleteBankAccount(id, accountId);
  }
}
