import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

@Injectable()
export class GraphMailService {
  private readonly logger = new Logger(GraphMailService.name);
  private client: Client;

  constructor() {
    const tenantId = process.env.GRAPH_TENANT_ID;
    const clientId = process.env.GRAPH_CLIENT_ID;
    const clientSecret = process.env.GRAPH_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
      this.logger.error(
        'Variables de entorno de Microsoft Graph no configuradas. ' +
        'Asegúrate de configurar GRAPH_TENANT_ID, GRAPH_CLIENT_ID y GRAPH_CLIENT_SECRET'
      );
      throw new Error(
        'Microsoft Graph credentials not configured. Please set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET environment variables.'
      );
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

    this.client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken('https://graph.microsoft.com/.default');
          return token.token;
        },
      },
    });
  }

  async sendMail(to: string, subject: string, htmlBody: string, attachments?: Array<{ name: string; contentBytes: string; contentType: string }>) {
    const from = process.env.GRAPH_SENDER!;
    const message: any = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: htmlBody,
        },
        toRecipients: [
          {
            emailAddress: { address: to },
          },
        ],
      },
      saveToSentItems: true,
    };

    // Agregar adjuntos si existen
    if (attachments && attachments.length > 0) {
      message.message.attachments = attachments.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.name,
        contentType: att.contentType,
        contentBytes: att.contentBytes,
      }));
    }

    try {
      await this.client.api(`/users/${from}/sendMail`).post(message);
      return { ok: true, to, attachmentsCount: attachments?.length || 0 };
    } catch (error) {
      this.logger.error('Error al enviar email con Graph API', error);
      throw error;
    }
  }
}
