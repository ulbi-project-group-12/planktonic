import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthRepository } from './auth.repository.js';
import { AuthGuard } from './guards/auth.guard.js';
import { LoginAttemptsConnection } from './login/login-attempts.connection.js';
import { LoginController } from './login/login.controller.js';
import { LoginRepository } from './login/login.repository.js';
import { LoginService } from './login/login.service.js';
import { MeController } from './me/me.controller.js';
import { RefreshController } from './refresh/refresh.controller.js';
import { RefreshService } from './refresh/refresh.service.js';
import { SessionRepository } from './session/session.repository.js';
import { PasswordBreachService } from './register/password-breach.service.js';
import { RegisterController } from './register/register.controller.js';
import { RegisterRepository } from './register/register.repository.js';
import { RegisterService } from './register/register.service.js';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [RegisterController, LoginController, MeController, RefreshController],
  providers: [
    RegisterService,
    PasswordBreachService,
    RegisterRepository,
    LoginService,
    LoginAttemptsConnection,
    LoginRepository,
    AuthRepository,
    RefreshService,
    SessionRepository,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
