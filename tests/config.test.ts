import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cmsConfig } from '../src/admin/config';
test('acepta el bloque PKCE real de DecapBridge sin app_id ni status_endpoint', () => {
  const config = cmsConfig({ baseUrl: 'https://auth.decapbridge.com', gatewayUrl: 'https://gateway.decapbridge.com', authEndpoint: '/sites/site-id/pkce', tokenEndpoint: '/sites/site-id/token' });
  assert.equal(config.backend.gateway_url, 'https://gateway.decapbridge.com');
  assert.equal('app_id' in config.backend, false);
  assert.equal('status_endpoint' in config.backend, false);
  assert.equal(config.backend.repo, 'nachodev-ui/fusion_x8_cafeteria');
  assert.equal(config.auth.email_claim, 'email');
});
