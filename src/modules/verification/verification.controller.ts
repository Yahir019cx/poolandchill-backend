import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../admin/guards/admin-role.guard';
import { DiditWebhookGuard } from './guards/didit-webhook.guard';
import { VerificationService } from './verification.service';
import { DiditWebhookDto, SendVerificationEmailDto } from './dto';

@ApiTags('Identity Verification')
@Controller(['verification', 'kyc']) // /verification/start (web) y /kyc/start (móvil) usan el mismo flujo
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  // ══════════════════════════════════════════════════
  // ENDPOINTS PARA EL USUARIO
  // ══════════════════════════════════════════════════

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar verificación de identidad',
    description: `
      Inicia una sesión de verificación de identidad con Didit.
      Mismo flujo para web y móvil (SDK Android).

      **Rutas:** POST /verification/start o POST /kyc/start (alias para móvil).

      **Web:** usar data.verificationUrl y abrir en navegador.
      **Móvil:** usar data.sessionToken con DiditSdk.startVerification(token = sessionToken).

      **Flujo:**
      1. Usuario autenticado llama al endpoint
      2. Backend crea sesión en Didit (DIDIT_API_KEY, DIDIT_WORKFLOW_ID, vendor_data = userId)
      3. Backend guarda didit_session_id y retorna sessionToken (+ verificationUrl para web)
      4. Didit notifica resultado vía webhook; backend actualiza estado
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión de verificación creada. Web usa verificationUrl; móvil usa sessionToken con DiditSdk.startVerification(token).',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Sesión de verificación creada' },
        data: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', example: 'ses_abc123' },
            verificationUrl: {
              type: 'string',
              example: 'https://verify.didit.me/session/abc123',
            },
            sessionToken: {
              type: 'string',
              description: 'Token para SDK Android: DiditSdk.startVerification(token = sessionToken). No exponer API key ni workflow en cliente.',
              example: 'token_xxx',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Error al crear sesión' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async startVerification(@Request() req: any) {
    const userId = req.user.userId;
    return this.verificationService.startVerification(userId);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar estado de verificación',
    description: 'Retorna el estado actual de verificación de identidad del usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de verificación',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            isVerified: { type: 'boolean', example: false },
            verificationStatus: { type: 'string', example: 'In Progress' },
            hasPendingSession: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getStatus(@Request() req: any) {
    const userId = req.user.userId;
    return this.verificationService.getVerificationStatus(userId);
  }

  // ══════════════════════════════════════════════════
  // ENVÍO DE CORREO (PANEL ADMIN - VERIFICACIONES ANFITRIONES)
  // ══════════════════════════════════════════════════

  @Post('send-verification-email')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar correo de verificación al anfitrión',
    description: `
      Envía un correo al anfitrión con un botón que lleva a FRONTEND_URL/login.
      Tras el login, el frontend redirige a /verification/start y al flujo Didit.
      Solo administradores. Usado desde el panel de Verificaciones de Anfitriones.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Correo enviado',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Correo de verificación enviado.' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 403, description: 'Sin permisos de administrador' })
  async sendVerificationEmail(@Body() dto: SendVerificationEmailDto) {
    return this.verificationService.sendVerificationEmail(dto.userId);
  }

  // ══════════════════════════════════════════════════
  // WEBHOOK DE DIDIT
  // ══════════════════════════════════════════════════

  @Post('webhook/didit')
  @UseGuards(DiditWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // No mostrar en Swagger (es interno)
  async handleWebhook(@Body() payload: DiditWebhookDto) {
    return this.verificationService.processWebhook(payload);
  }
}
