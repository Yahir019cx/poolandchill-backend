import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Swagger solo en desarrollo (no exponer en producción)
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
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

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port);
  console.log(`Servidor corriendo en http://localhost:${port}`);
  if (nodeEnv !== 'production') {
    console.log(`Swagger disponible en http://localhost:${port}/api/docs`);
  }
}
bootstrap();
