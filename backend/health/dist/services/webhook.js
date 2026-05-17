import { env } from '../config/env.js';
const WEBHOOK_TIMEOUT_MS = 5000;
const DEGRADED_WEBHOOK_DETAILS = 'PostgreSQL unreachable';
export async function sendDegradedWebhook(timestamp, log) {
    const webhookUrl = env.healthWebhookUrl;
    if (webhookUrl === '') {
        return;
    }
    const body = {
        service: 'ecotrack-health',
        status: 'degraded',
        timestamp,
        details: DEGRADED_WEBHOOK_DETAILS,
    };
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        });
        if (!response.ok) {
            log.warn({ statusCode: response.status, webhookUrl }, 'Degraded health webhook returned non-OK status');
        }
        else {
            log.info({ webhookUrl }, 'Degraded health webhook sent');
        }
    }
    catch (error) {
        log.warn({ err: error, webhookUrl }, 'Failed to send degraded health webhook');
    }
}
