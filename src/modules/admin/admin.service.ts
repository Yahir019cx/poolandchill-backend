import { Injectable, BadRequestException } from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../config/database.config';

@Injectable()
export class AdminService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Obtener propiedades pendientes de revisión
   */
  async getPendingProperties(page: number = 1, pageSize: number = 20) {
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('PageNumber', sql.Int, page);
    request.input('PageSize', sql.Int, pageSize);

    const result = await request.execute('[property].[xsp_GetPendingProperties]');

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
        ResultMessage || 'Propiedad no encontrada o no está pendiente de revisión.',
      );
    }

    return {
      success: true,
      message: 'Propiedad aprobada.',
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
        ResultMessage || 'Propiedad no encontrada o no está pendiente de revisión.',
      );
    }

    return {
      success: true,
      message: 'Propiedad rechazada.',
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
}
