import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  PricingSpecialRateController,
  PricingSpecialRateService,
} from './special-rate';
import {
  PricingDateBlocksController,
  PricingDateBlocksService,
} from './date-blocks';

/**
 * Módulo de pricing (tarifas y bloqueos).
 *
 * - special-rate: POST /pricing/special-rate (crear), POST /pricing/special-rate/deactivate (desactivar)
 * - date-blocks: POST /pricing/date-blocks (crear bloqueo), DELETE /pricing/date-blocks (eliminar bloqueos)
 */
@Module({
  imports: [AuthModule],
  controllers: [PricingSpecialRateController, PricingDateBlocksController],
  providers: [PricingSpecialRateService, PricingDateBlocksService],
  exports: [PricingSpecialRateService, PricingDateBlocksService],
})
export class PricingModule {}
