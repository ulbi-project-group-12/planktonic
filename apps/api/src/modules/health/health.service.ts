import { Injectable } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';

@Injectable()
export class HealthService {
  constructor(private readonly health: HealthCheckService) {}

  /** Liveness: no indicators, so it never touches the database or another backend (D-12). */
  live() {
    return this.health.check([]);
  }
}
