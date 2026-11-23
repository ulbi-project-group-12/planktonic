import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository.js';
import { AuthGuard } from './guards/auth.guard.js';
import { LoginController } from './login/login.controller.js';
import { LoginRepository } from './login/login.repository.js';
import { LoginService } from './login/login.service.js';
import { MeController } from './me/me.controller.js';
import { RegisterController } from './register/register.controller.js';
import { RegisterRepository } from './register/register.repository.js';
import { RegisterService } from './register/register.service.js';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [RegisterController, LoginController, MeController],
  providers: [
    RegisterService,
    RegisterRepository,
    LoginService,
    LoginRepository,
    AuthRepository,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
