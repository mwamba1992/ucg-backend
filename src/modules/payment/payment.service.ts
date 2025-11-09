// payment.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { ReferenceService } from '../reference/reference.service';
import { CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly referenceService: ReferenceService,
  ) {}

  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const reference = await this.referenceService.findByReferenceNumber(dto.referenceNumber);

    if (!reference) {
      throw new BadRequestException('Invalid reference number');
    }

    if (dto.amountPaid < reference.amount) {
      throw new BadRequestException('Amount paid is less than required');
    }

    const payment = this.paymentRepo.create(dto);
    return this.paymentRepo.save(payment);
  }

  // payment.service.ts
async getPaymentsByReference(referenceNumber: string): Promise<Payment[]> {
  return this.paymentRepo.find({ where: { referenceNumber } });
}

}
