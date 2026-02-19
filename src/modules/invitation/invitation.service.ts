import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../config/database.config';
import { ZohoMailService } from '../../web/email/zoho-mail.service';
import { invitationConfirmedTemplate } from '../../web/email/templates';
import { CreateInvitationDto } from './dto';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly zohoMailService: ZohoMailService,
  ) {}

  async createInvitation(dto: CreateInvitationDto) {
    const { nombre, numero, correo, invitados } = dto;

    this.logger.log(`Creating invitation for: ${correo}`);

    try {
      const result = await this.databaseService.executeStoredProcedure(
        'xsp_InsertInvitation',
        [
          { name: 'Nombre', type: sql.NVarChar(100), value: nombre },
          { name: 'Numero', type: sql.NVarChar(20), value: numero },
          { name: 'Correo', type: sql.NVarChar(100), value: correo },
          { name: 'Invitados', type: sql.Int, value: invitados },
        ],
        [],
      );

      this.logger.log(`Invitation created successfully for: ${correo}`);

      const resolvedNombre = result?.recordset?.[0]?.Nombre || nombre;
      const resolvedCorreo = result?.recordset?.[0]?.Correo || correo;

      try {
        const html = invitationConfirmedTemplate(resolvedNombre, invitados);
        await this.zohoMailService.sendMail(
          resolvedCorreo,
          '¡Tu asistencia fue confirmada! 🎉',
          html,
        );
        this.logger.log(`Confirmation email sent to: ${resolvedCorreo}`);
      } catch (emailError) {
        this.logger.error(
          `Failed to send confirmation email to ${resolvedCorreo}: ${emailError.message}`,
          emailError.stack,
        );
      }

      return {
        ok: true,
        nombre: resolvedNombre,
        correo: resolvedCorreo,
      };
    } catch (error) {
      this.logger.error('Error creating invitation', error);
      throw new InternalServerErrorException('Error al crear invitación');
    }
  }
}
