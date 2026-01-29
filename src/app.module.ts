import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ContactModule } from './web/email/contact/contact.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { DatabaseModule } from './config/database.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    // Rate Limiting global - se puede sobrescribir por endpoint
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minuto
        limit: 10, // 10 requests por minuto (default)
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 20, // 20 requests por minuto
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100, // 100 requests por minuto
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public',
    }),
    ContactModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
  ],
})
export class AppModule {}
