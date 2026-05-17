export type ServiceStatus = 'up' | 'down';

export interface HealthServices {
  db: ServiceStatus;
  auth: 'up';
}

export interface HealthPayload {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: HealthServices;
}

export interface DegradedWebhookBody {
  service: 'ecotrack-health';
  status: 'degraded';
  timestamp: string;
  details: 'PostgreSQL unreachable';
}
