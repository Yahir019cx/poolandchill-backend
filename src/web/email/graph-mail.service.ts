import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

@Injectable()
export class GraphMailService {
  private readonly logger = new Logger(GraphMailService.name);
  private client: Client;

  constructor() {
    const tenantId = process.env.GRAPH_TENANT_ID!;
    const clientId = process.env.GRAPH_CLIENT_ID!;
    const clientSecret = process.env.GRAPH_CLIENT_SECRET!;

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

  async sendMail(to: string, subject: string, htmlBody: string) {
    const from = process.env.GRAPH_SENDER!;
    const message = {
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

    try {
      await this.client.api(`/users/${from}/sendMail`).post(message);
      return { ok: true, to };
    } catch (error) {
      throw error;
    }
  }
}
