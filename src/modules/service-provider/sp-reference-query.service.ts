import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { ServiceProvider } from './entities/service-provider.entity';
import { SpReferenceQueryResultDto } from './dto/sp-reference-query.dto';

/**
 * Generic client for Flow A: querying an external SP's own system for a
 * reference number.
 *
 * Onboarding a new SP is config only — set spReferencePrefix + referenceQueryUrl
 * (+ outboundApiKey) on the service_providers row. This one service serves every
 * SP because they all implement the published contract:
 *
 *   GET {referenceQueryUrl}/api/v1/sp/references/{referenceNumber}
 *   Authorization: Bearer {outboundApiKey}
 *
 * Routing is by prefix: an incoming reference is matched against each SP's
 * spReferencePrefix (longest match wins). No prefix match => not an external
 * reference; callers fall back to internal validation.
 */
@Injectable()
export class SpReferenceQueryService {
  private readonly logger = new Logger(SpReferenceQueryService.name);

  constructor(
    @InjectRepository(ServiceProvider)
    private readonly serviceProviderRepository: Repository<ServiceProvider>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Find the SP whose configured prefix the reference starts with.
   * Returns null when the reference belongs to no external SP (i.e. it is an
   * internal UCG reference and should be validated locally).
   */
  async findSpByReference(referenceNumber: string): Promise<ServiceProvider | null> {
    if (!referenceNumber) {
      return null;
    }

    // `:ref LIKE prefix || '%'` => reference starts with the stored prefix.
    // Longest prefix wins so "SCH" beats "SC" when both could match.
    return this.serviceProviderRepository
      .createQueryBuilder('sp')
      .where('sp.spReferencePrefix IS NOT NULL')
      .andWhere('sp.referenceQueryUrl IS NOT NULL')
      .andWhere(':ref LIKE sp.spReferencePrefix || :wild', {
        ref: referenceNumber,
        wild: '%',
      })
      .orderBy('LENGTH(sp.spReferencePrefix)', 'DESC')
      .getOne();
  }

  /**
   * Whether the reference belongs to an external SP (so it must be looked up
   * remotely rather than validated against our database).
   */
  async isExternalReference(referenceNumber: string): Promise<boolean> {
    return (await this.findSpByReference(referenceNumber)) !== null;
  }

  /**
   * Query the owning SP's system for a reference and return the result in the
   * standard shape.
   *
   * @throws NotFoundException if no SP prefix matches the reference.
   * @throws ServiceUnavailableException if the SP's endpoint errors out.
   */
  async queryReference(referenceNumber: string): Promise<SpReferenceQueryResultDto> {
    const sp = await this.findSpByReference(referenceNumber);
    if (!sp) {
      throw new NotFoundException(
        `No external service provider configured for reference ${referenceNumber}`,
      );
    }

    const url = `${sp.referenceQueryUrl.replace(/\/+$/, '')}/api/v1/sp/references/${encodeURIComponent(
      referenceNumber,
    )}`;
    this.logger.log(`Querying SP ${sp.spCode} for reference ${referenceNumber} -> ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            ...(sp.outboundApiKey
              ? { Authorization: `Bearer ${sp.outboundApiKey}` }
              : {}),
            Accept: 'application/json',
          },
          timeout: 30000,
        }),
      );

      const data = response.data ?? {};
      // Trust an explicit isValid; else derive from status; else assume the SP
      // returning 2xx with a body means the reference is good.
      const isValid =
        data.isValid !== undefined
          ? !!data.isValid
          : data.status !== undefined
            ? data.status === 'OK'
            : true;
      return {
        isValid,
        referenceNumber,
        spCode: sp.spCode,
        customerName: data.customerName,
        amount: data.amount,
        description: data.description,
        status: data.status,
        raw: data,
      };
    } catch (error) {
      const status = error?.response?.status;
      const body = error?.response?.data;
      this.logger.error(
        `SP ${sp.spCode} reference query failed (${status ?? 'no response'}): ${
          body ? JSON.stringify(body) : error?.message
        }`,
      );

      // A 404 from the SP means the reference does not exist on their side.
      if (status === 404) {
        return {
          isValid: false,
          referenceNumber,
          spCode: sp.spCode,
          status: 'NOT_FOUND',
          raw: body,
        };
      }

      throw new ServiceUnavailableException(
        `Unable to query service provider ${sp.spCode} for reference ${referenceNumber}`,
      );
    }
  }
}
