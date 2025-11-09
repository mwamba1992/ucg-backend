import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { Payment } from './entities/payment.entity';

@ApiTags('Payments Service')
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
}
