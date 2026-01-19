import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReferenceService } from './reference.service';
import { CreateReferenceDto } from './dto/create-reference.dto';
import { UpdateReferenceDto } from './dto/update-reference.dto';
import { QueryReferenceDto } from './dto/query-reference.dto';
import { BulkCreateReferenceDto } from './dto/bulk-create-reference.dto';
import {
  ReferenceResponseDto,
  ValidateReferenceResponseDto,
} from './dto/reference-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Payment References')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('references')
export class ReferenceController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new payment reference (synchronous)' })
  @ApiResponse({
    status: 201,
    description: 'Payment reference successfully created',
    type: ReferenceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createDto: CreateReferenceDto) {
    return await this.referenceService.create(createDto);
  }

  @Post('async')
  @ApiOperation({ summary: 'Generate a new payment reference (asynchronous via RabbitMQ)' })
  @ApiResponse({
    status: 202,
    description: 'Reference creation queued for processing',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @HttpCode(HttpStatus.ACCEPTED)
  async createAsync(@Body() createDto: CreateReferenceDto) {
    return await this.referenceService.createAsync(createDto, true);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create payment references' })
  @ApiResponse({
    status: 201,
    description: 'Bulk references created',
  })
  async bulkCreate(@Body() bulkDto: BulkCreateReferenceDto) {
    return await this.referenceService.bulkCreate(bulkDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payment references with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of payment references',
  })
  async findAll(@Query() query: QueryReferenceDto) {
    return await this.referenceService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get payment reference statistics' })
  @ApiResponse({
    status: 200,
    description: 'Reference statistics',
  })
  async getStatistics(@Query('serviceProviderId') serviceProviderId?: string) {
    return await this.referenceService.getStatistics(serviceProviderId);
  }

  @Get('validate/:referenceNumber')
  @ApiOperation({ summary: 'Validate a payment reference' })
  @ApiParam({
    name: 'referenceNumber',
    description: 'Reference number to validate (format: XXX-YYYYYYY-ZZZ)',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    type: ValidateReferenceResponseDto,
  })
  async validate(@Param('referenceNumber') referenceNumber: string) {
    return await this.referenceService.validate(referenceNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment reference by ID' })
  @ApiParam({ name: 'id', description: 'Reference UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment reference details',
    type: ReferenceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Reference not found' })
  async findOne(@Param('id') id: string) {
    const reference = await this.referenceService.findOne(id);
    return this.referenceService.toResponseDto(reference);
  }

  @Get('number/:referenceNumber')
  @ApiOperation({ summary: 'Get payment reference by reference number' })
  @ApiParam({
    name: 'referenceNumber',
    description: 'Reference number (format: XXX-YYYYYYY-ZZZ)',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment reference details',
    type: ReferenceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Reference not found' })
  async findByReferenceNumber(@Param('referenceNumber') referenceNumber: string) {
    const reference = await this.referenceService.findByReferenceNumber(referenceNumber);
    return this.referenceService.toResponseDto(reference);
  }

  @Get('sp/:serviceProviderId')
  @ApiOperation({ summary: 'Get payment references for a service provider' })
  @ApiParam({
    name: 'serviceProviderId',
    description: 'Service Provider UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payment references',
  })
  async findByServiceProvider(
    @Param('serviceProviderId') serviceProviderId: string,
    @Query() query: QueryReferenceDto,
  ) {
    query.serviceProviderId = serviceProviderId;
    return await this.referenceService.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment reference details' })
  @ApiParam({ name: 'id', description: 'Reference UUID' })
  @ApiResponse({
    status: 200,
    description: 'Reference updated successfully',
    type: ReferenceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Reference not found' })
  @ApiResponse({ status: 400, description: 'Cannot update used reference' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateReferenceDto,
  ) {
    return await this.referenceService.update(id, updateDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a payment reference' })
  @ApiParam({ name: 'id', description: 'Reference UUID' })
  @ApiResponse({
    status: 200,
    description: 'Reference cancelled successfully',
    type: ReferenceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Reference not found' })
  @ApiResponse({ status: 400, description: 'Cannot cancel used reference' })
  async cancel(@Param('id') id: string) {
    return await this.referenceService.cancel(id);
  }

  @Post('expire-old')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Auto-expire old references (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Number of references expired',
  })
  async expireOldReferences() {
    const count = await this.referenceService.expireOldReferences();
    return {
      message: `${count} references expired`,
      count,
    };
  }
}
