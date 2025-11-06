import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ServiceProviderService } from './service-provider.service';
import { CreateServiceProviderDto } from './dto/create-service-provider.dto';
import { UpdateServiceProviderDto } from './dto/update-service-provider.dto';
import { QueryServiceProviderDto } from './dto/query-service-provider.dto';
import { ServiceProviderResponseDto } from './dto/service-provider-response.dto';

@ApiTags('Service Providers')
@Controller('service-providers')
export class ServiceProviderController {
  constructor(
    private readonly serviceProviderService: ServiceProviderService,
  ) {}

  @Post()
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
  @ApiOperation({ summary: 'Get all service providers with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of service providers',
  })
  async findAll(@Query() query: QueryServiceProviderDto) {
    return await this.serviceProviderService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get service provider statistics' })
  @ApiResponse({
    status: 200,
    description: 'Service provider statistics',
  })
  async getStatistics() {
    return await this.serviceProviderService.getStatistics();
  }

  @Get(':id')
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
  @ApiOperation({ summary: 'Approve service provider onboarding' })
  @ApiParam({ name: 'id', description: 'Service provider UUID' })
  @ApiResponse({
    status: 200,
    description: 'Service provider approved successfully',
    type: ServiceProviderResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Service provider not found' })
  @ApiResponse({ status: 400, description: 'Already approved' })
  async approve(@Param('id') id: string) {
    // TODO: Get admin user ID from JWT token
    const approvedBy = 'admin-user-id'; // Temporary placeholder
    return await this.serviceProviderService.approve(id, approvedBy);
  }

  @Post(':id/reject')
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
}
