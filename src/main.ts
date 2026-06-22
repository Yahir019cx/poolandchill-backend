import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DatabaseService } from './config/database.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://poolandchill.com.mx',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const configService = app.get(ConfigService);

  // Swagger habilitado por defecto.
  // Si quieres desactivarlo, define ENABLE_SWAGGER=false
  const enableSwagger =
    configService.get<string>('ENABLE_SWAGGER', 'true') === 'true';

  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Pool&Chill API')
      .setDescription('Documentación oficial de la API NestJS')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Ingresa tu Access Token JWT',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('poolchill')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'Pool&Chill API Docs',
    });
  }

  const port = configService.get<number>('PORT') || 3000;

  const logger = new Logger('Bootstrap');

  await app.listen(port);

  logger.log(`Servidor corriendo en puerto ${port}`);

  if (enableSwagger) {
    logger.log(`Swagger disponible en /api/docs`);
  }

  const databaseService = app.get(DatabaseService);

  try {
    await databaseService.getConnection();
    logger.log('Conexion Successful');
  } catch (error) {
    logger.error(`No se pudo conectar a SQL Server: ${error.message}`);
  }
}

bootstrap();
