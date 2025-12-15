import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { Payment } from './entities/payment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Payments Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Make a payment using a reference number' })
  @ApiResponse({
    status: 201,
    description: 'Payment successfully created',
    type: Payment,
  })
  @ApiResponse({ status: 400, description: 'Invalid payment data or amount' })
  @ApiResponse({ status: 404, description: 'Reference not found' })
  async createPayment(@Body() dto: CreatePaymentDto) {
    return await this.paymentService.createPayment(dto);
  }

  @Get(':referenceNumber')
  @ApiOperation({ summary: 'Get all payments made for a specific reference number' })
  @ApiParam({ name: 'referenceNumber', description: 'Reference number for the payment' })
  @ApiResponse({
    status: 200,
    description: 'List of payments for the reference number',
    type: [Payment],
  })
  @ApiResponse({ status: 404, description: 'No payments found for this reference' })
  async getPaymentsByReference(@Param('referenceNumber') referenceNumber: string) {
    const payments = await this.paymentService.getPaymentsByReference(referenceNumber);

    if (!payments || payments.length === 0) {
      throw new NotFoundException('No payments found for this reference');
    }

    return payments;
  }

  @Get(':referenceNumber/summary')
  @ApiOperation({
    summary: 'Get payment summary including installments and remaining amount',
  })
  @ApiParam({ name: 'referenceNumber', description: 'Reference number' })
  @ApiResponse({
    status: 200,
    description: 'Payment summary with installment details',
  })
  @ApiResponse({ status: 400, description: 'Invalid reference number' })
  async getPaymentSummary(@Param('referenceNumber') referenceNumber: string) {
    return await this.paymentService.getPaymentSummary(referenceNumber);
  }
}
