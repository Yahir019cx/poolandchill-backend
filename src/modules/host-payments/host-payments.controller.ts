import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HostPaymentsService } from './host-payments.service';
import { CreateConnectAccountDto } from './dto/create-connect-account.dto';

@ApiTags('Host Payments (Stripe Connect)')
@Controller('stripe')
export class HostPaymentsController {
  constructor(private readonly hostPaymentsService: HostPaymentsService) {}

  @Post('connect/create-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crear cuenta Stripe Connect Express',
    description: `
      Crea una cuenta Express en Stripe Connect para el host,
      genera el link de onboarding y registra el StripeAccountId en BD.
      Retorna la URL para que el usuario complete el onboarding.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Link de onboarding generado',
    schema: {
      type: 'object',
      properties: {
        onboardingUrl: { type: 'string', description: 'URL de Stripe Connect onboarding' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o error de Stripe' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async createConnectAccount(@Body() dto: CreateConnectAccountDto, @Req() req: any) {
    const userId = dto?.userId ?? req.user?.userId;
    if (!userId) {
      throw new BadRequestException('UserId es requerido');
    }
    return this.hostPaymentsService.createConnectAccount(userId);
  }

  @Get('account-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Estado de la cuenta Stripe Connect del host',
    description: `
      Devuelve chargesEnabled, payoutsEnabled y onboardingCompleted.
      Opcionalmente refresca el estado desde Stripe (útil tras el deep link
      por si el webhook aún no ha llegado).
      El front debe llamar a completeHostOnboarding() solo cuando
      chargesEnabled === true && payoutsEnabled === true.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la cuenta',
    schema: {
      type: 'object',
      properties: {
        hasAccount: { type: 'boolean' },
        chargesEnabled: { type: 'boolean' },
        payoutsEnabled: { type: 'boolean' },
        onboardingCompleted: { type: 'boolean' },
        accountStatus: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getAccountStatus(@Req() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('UserId es requerido');
    }
    return this.hostPaymentsService.getAccountStatus(userId, { refreshFromStripe: true });
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request> & Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) {
      throw new BadRequestException('Cuerpo o firma del webhook ausentes');
    }
    return this.hostPaymentsService.processWebhook(rawBody, signature);
  }

  /**
   * Endpoint de redirección para cuando el usuario completa el onboarding de Stripe.
   * Redirige al deep link de la app móvil: poolandchill://stripe/return
   */
  @Get('return')
  @ApiExcludeEndpoint()
  async handleReturn(@Res() res: Response) {
    // Redirigir al deep link de la app móvil
    res.redirect('poolandchill://stripe/return');
  }

  /**
   * Endpoint de redirección para cuando el usuario necesita refrescar el onboarding de Stripe.
   * Redirige al deep link de la app móvil: poolandchill://stripe/refresh
   */
  @Get('refresh')
  @ApiExcludeEndpoint()
  async handleRefresh(@Res() res: Response) {
    // Redirigir al deep link de la app móvil
    res.redirect('poolandchill://stripe/refresh');
  }
}
