import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../config/database.config';
import { ZohoMailService } from '../../web/email/zoho-mail.service';
import {
  propertyApprovedTemplate,
  propertyRejectedTemplate,
} from '../../web/email/templates';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly zohoMailService: ZohoMailService,
  ) {}

  /**
   * Obtener propiedades pendientes de revisión
   */
  async getPendingProperties(page: number = 1, pageSize: number = 20) {
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('PageNumber', sql.Int, page);
    request.input('PageSize', sql.Int, pageSize);

    const result = await request.execute(
      '[property].[xsp_GetPendingProperties]',
    );

    const recordsets = result.recordsets as any[];
    const totalCount = recordsets[0]?.[0]?.TotalCount || 0;
    const properties = recordsets[1] || [];

    return {
      success: true,
      data: {
        totalCount,
        page,
        pageSize,
        properties: properties.map((p: any) => ({
          propertyId: p.ID_Property,
          propertyName: p.PropertyName,
          hasPool: p.HasPool,
          hasCabin: p.HasCabin,
          hasCamping: p.HasCamping,
          submittedAt: p.SubmittedAt,
          location: p.Location,
          priceFrom: p.PriceFrom,
          owner: {
            name: p.OwnerName,
            email: p.OwnerEmail,
            phone: p.OwnerPhone,
          },
          images: p.Images ? JSON.parse(p.Images) : [],
        })),
      },
    };
  }

  async getAllProperties(): Promise<any[]> {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_GetAllProperties]',
      [], // No inputs
      [], // No outputs
    );

    return result.recordset || [];
  }

  /**
   * Aprobar propiedad
   */
  async approveProperty(adminId: string, propertyId: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_ApproveProperty]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'ID_Admin', type: sql.UniqueIdentifier, value: adminId },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(
        ResultMessage ||
          'Propiedad no encontrada o no está pendiente de revisión.',
      );
    }

    // Enviar email al dueño (fire-and-forget)
    const ownerData = result.recordset?.[0];
    if (ownerData?.Email) {
      const html = propertyApprovedTemplate(
        ownerData.FirstName,
        ownerData.PropertyName,
      );
      this.zohoMailService
        .sendMail(
          ownerData.Email,
          'Tu propiedad ha sido aprobada - Pool & Chill',
          html,
        )
        .then(() =>
          this.logger.log(`Email de aprobación enviado a ${ownerData.Email}`),
        )
        .catch((err) =>
          this.logger.error(
            `Error enviando email de aprobación: ${err.message}`,
          ),
        );
    }

    return {
      success: true,
      message: ResultMessage || 'Propiedad aprobada.',
    };
  }

  /**
   * Rechazar propiedad
   */
  async rejectProperty(adminId: string, propertyId: string, reason: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_RejectProperty]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'ID_Admin', type: sql.UniqueIdentifier, value: adminId },
        { name: 'RejectionReason', type: sql.NVarChar(500), value: reason },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(
        ResultMessage ||
          'Propiedad no encontrada o no está pendiente de revisión.',
      );
    }

    // Enviar email al dueño (fire-and-forget)
    const ownerData = result.recordset?.[0];
    if (ownerData?.Email) {
      const html = propertyRejectedTemplate(
        ownerData.FirstName,
        ownerData.PropertyName,
        reason,
      );
      this.zohoMailService
        .sendMail(
          ownerData.Email,
          'Actualización sobre tu propiedad - Pool & Chill',
          html,
        )
        .then(() =>
          this.logger.log(`Email de rechazo enviado a ${ownerData.Email}`),
        )
        .catch((err) =>
          this.logger.error(`Error enviando email de rechazo: ${err.message}`),
        );
    }

    return {
      success: true,
      message: ResultMessage || 'Propiedad rechazada.',
    };
  }

  /**
   * Suspender propiedad
   */
  async suspendProperty(adminId: string, propertyId: string, reason: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_SuspendProperty]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'ID_Admin', type: sql.UniqueIdentifier, value: adminId },
        { name: 'SuspensionReason', type: sql.NVarChar(500), value: reason },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(
        ResultMessage || 'Propiedad no encontrada o no puede ser suspendida.',
      );
    }

    return {
      success: true,
      message: 'Propiedad suspendida.',
    };
  }

  async UpdateStateProperty(Op: number, propertyId: string) {
    const result = await this.databaseService.executeStoredProcedure(
      '[property].[xsp_UpdateStateProperty]',
      [
        { name: 'ID_Property', type: sql.UniqueIdentifier, value: propertyId },
        { name: 'Op', type: sql.Int, value: Op },
      ],
      [
        { name: 'ResultCode', type: sql.Int },
        { name: 'ResultMessage', type: sql.NVarChar(500) },
      ],
    );

    const { ResultCode, ResultMessage } = result.output;

    if (ResultCode !== 0) {
      throw new BadRequestException(
        ResultMessage || 'No se pudo actualizar la propiedad.',
      );
    }

    return {
      success: true,
      message: ResultMessage || 'Operación realizada correctamente.',
    };
  }
}
