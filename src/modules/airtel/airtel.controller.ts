import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../user/entities/user.entity';
import { AirtelService } from './airtel.service';
import { AirtelStatus } from './dto/airtel-notification.dto';

@ApiTags('Airtel')
@Controller('airtel')
export class AirtelController {
  private readonly logger = new Logger(AirtelController.name);

  constructor(
    private readonly airtelService: AirtelService,
  ) {}

  /**
   * Airtel C2B: Validate Transaction
   * Called by Airtel to validate if a reference/account exists before processing payment
   */
  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Airtel C2B Validate Transaction',
    description: 'Validates if a payment reference exists and can accept the specified amount.',
  })
  @ApiResponse({ status: 200, description: 'Validation response (XML)' })
  async validateTransaction(@Body() xmlBody: string): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.log('Airtel VALIDATE request received');
      this.logger.log(`Raw XML:\n${xmlBody}`);

      const response = await this.airtelService.handleValidateTransaction(xmlBody);

      const responseTime = Date.now() - startTime;
      this.logger.log(`Airtel VALIDATE response (${responseTime}ms):\n${response}`);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Airtel VALIDATE error (${responseTime}ms): ${error.message}`, error.stack);

      return this.airtelService.buildResponseXml({
        STATUS: AirtelStatus.BAD_REQUEST,
        MESSAGE: 'Internal error',
      });
    }
  }

  /**
   * Airtel C2B: Process Transaction
   * Called by Airtel to process the actual payment after validation
   */
  @Public()
  @Post('process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Airtel C2B Process Transaction',
    description: 'Processes an Airtel payment. Creates payment record and executes GL transfer.',
  })
  @ApiResponse({ status: 200, description: 'Process response (XML)' })
  async processTransaction(@Body() xmlBody: string): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.log('Airtel PROCESS request received');
      this.logger.log(`Raw XML:\n${xmlBody}`);

      const response = await this.airtelService.handleProcessTransaction(xmlBody);

      const responseTime = Date.now() - startTime;
      this.logger.log(`Airtel PROCESS response (${responseTime}ms):\n${response}`);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Airtel PROCESS error (${responseTime}ms): ${error.message}`, error.stack);

      return this.airtelService.buildResponseXml({
        STATUS: AirtelStatus.BAD_REQUEST,
        TXNID: '',
        MESSAGE: 'Internal error',
      });
    }
  }

  /**
   * Airtel C2B: Transaction Enquiry
   * Called by Airtel to check the status of a previously processed transaction
   */
  @Public()
  @Post('enquiry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Airtel C2B Transaction Enquiry',
    description: 'Returns the status of a previously processed Airtel transaction.',
  })
  @ApiResponse({ status: 200, description: 'Enquiry response (XML)' })
  async transactionEnquiry(@Body() xmlBody: string): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.log('Airtel ENQUIRY request received');
      this.logger.log(`Raw XML:\n${xmlBody}`);

      const response = await this.airtelService.handleTransactionEnquiry(xmlBody);

      const responseTime = Date.now() - startTime;
      this.logger.log(`Airtel ENQUIRY response (${responseTime}ms):\n${response}`);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Airtel ENQUIRY error (${responseTime}ms): ${error.message}`, error.stack);

      return this.airtelService.buildResponseXml({
        STATUS: AirtelStatus.BAD_REQUEST,
        MESSAGE: 'Internal error',
        REF: '',
      });
    }
  }

  /**
   * Airtel C2B: Bill Fetch
   * Called by Airtel to fetch bill details for a customer reference
   */
  @Public()
  @Post('billfetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Airtel C2B Bill Fetch',
    description: 'Returns bill details (amount, customer name, description) for a reference.',
  })
  @ApiResponse({ status: 200, description: 'Bill fetch response (XML)' })
  async billFetch(@Body() xmlBody: string): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.log('Airtel BILLFETCH request received');
      this.logger.log(`Raw XML:\n${xmlBody}`);

      const response = await this.airtelService.handleBillFetch(xmlBody);

      const responseTime = Date.now() - startTime;
      this.logger.log(`Airtel BILLFETCH response (${responseTime}ms):\n${response}`);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Airtel BILLFETCH error (${responseTime}ms): ${error.message}`, error.stack);

      return this.airtelService.buildResponseXml({
        STATUS: AirtelStatus.NOT_FOUND,
        MESSAGE: 'Internal error',
      });
    }
  }

  /**
   * Airtel C2B: Lookup Details
   * Called by Airtel to look up customer/reference details
   */
  @Public()
  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Airtel C2B Lookup Details',
    description: 'Returns customer and reference details for a given reference number.',
  })
  @ApiResponse({ status: 200, description: 'Lookup response (XML)' })
  async lookupDetails(@Body() xmlBody: string): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.log('Airtel LOOKUP request received');
      this.logger.log(`Raw XML:\n${xmlBody}`);

      const response = await this.airtelService.handleLookupDetails(xmlBody);

      const responseTime = Date.now() - startTime;
      this.logger.log(`Airtel LOOKUP response (${responseTime}ms):\n${response}`);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Airtel LOOKUP error (${responseTime}ms): ${error.message}`, error.stack);

      return this.airtelService.buildResponseXml({
        STATUS: AirtelStatus.NOT_FOUND,
        MESSAGE: 'Internal error',
      });
    }
  }

  // ==================== Admin Endpoints ====================

  /**
   * Get all Airtel transactions
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all Airtel transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('referenceNumber') referenceNumber?: string,
  ) {
    return {
      message: 'Airtel transactions endpoint',
      page,
      limit,
      status,
      referenceNumber,
    };
  }

  /**
   * Get specific Airtel transaction
   */
  @Get('transactions/:txnId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Airtel transaction by transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransaction(@Param('txnId') txnId: string) {
    const transaction = await this.airtelService.getTransaction(txnId);

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    return { transaction };
  }

  /**
   * Retry failed Airtel transaction
   */
  @Post('transactions/:txnId/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry failed Airtel transaction' })
  @ApiResponse({ status: 200, description: 'Transaction retry initiated' })
  @ApiResponse({ status: 400, description: 'Transaction cannot be retried' })
  async retryTransaction(@Param('txnId') txnId: string) {
    const result = await this.airtelService.retryTransaction(txnId);

    return {
      message: 'Transaction retry completed',
      ...result,
    };
  }

  /**
   * Get Airtel configuration
   */
  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Airtel configuration' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved successfully' })
  async getConfig() {
    const config = await this.airtelService.getAirtelConfig();

    return {
      partnerCode: config.partnerCode,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Get Airtel statistics
   */
  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Airtel statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const statistics = await this.airtelService.getStatistics(start, end);

    return { statistics };
  }
}
