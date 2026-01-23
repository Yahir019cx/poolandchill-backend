import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContactModule } from './web/email/contact/contact.module';
import { AuthModule } from './modules/auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public',
    }),
    ContactModule,
    AuthModule,
  ],
})
export class AppModule {}
