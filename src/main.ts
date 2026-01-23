import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';

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

  const config = new DocumentBuilder()
    .setTitle('Pool & Chill API')
    .setDescription('Documentación oficial de la API NestJS')
    .setVersion('1.0')
    .addTag('poolchill')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port);
  console.log(`Servidor corriendo en http://localhost:${port}`);
  console.log(`Swagger disponible en http://localhost:${port}/api/docs`);

  const dataSource = app.get(DataSource);
  if (dataSource.isInitialized) {
    console.log('Conexión a la base de datos exitosa');
  } else {
    console.log('Error al conectar a la base de datos');
  }
}
bootstrap();
