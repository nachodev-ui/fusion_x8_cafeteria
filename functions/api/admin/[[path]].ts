import { handleAdminRequest, type AdminEnv } from '../../../src/server/admin-api';

export const onRequest = ({ request, env }: { request: Request; env: AdminEnv }) => handleAdminRequest(request, env);
