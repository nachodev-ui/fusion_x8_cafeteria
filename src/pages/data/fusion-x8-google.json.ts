import type { APIRoute } from 'astro';
import data from '../../data/google-maps.json';

export const GET: APIRoute = () => new Response(JSON.stringify(data, null, 2), {
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});
