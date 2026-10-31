export interface BridgeConfig { baseUrl: string; clientId?: string; gatewayUrl: string; authEndpoint: string; tokenEndpoint: string; statusEndpoint?: string }
export function cmsConfig(bridge: BridgeConfig) {
  return {
    backend: {
      name: 'fusion-git-gateway', branch: 'main', auth_type: 'pkce',
      repo: 'nachodev-ui/fusion_x8_cafeteria',
      base_url: bridge.baseUrl, gateway_url: bridge.gatewayUrl,
      auth_endpoint: bridge.authEndpoint, auth_token_endpoint: bridge.tokenEndpoint,
      ...(bridge.clientId ? { app_id: bridge.clientId } : {}),
      ...(bridge.statusEndpoint ? { status_endpoint: bridge.statusEndpoint } : {}),
      commit_messages: { update: 'Actualizar carta de Fusión x8' },
    },
    auth: { email_claim: 'email', first_name_claim: 'first_name', last_name_claim: 'last_name', avatar_url_claim: 'avatar_url' },
    logo_url: '/images/fusion-x8-logo.png',
    site_url: '/', display_url: '/',
    locale: 'es', load_config_file: false, show_preview_links: false,
    media_folder: 'public/images', public_folder: '/images',
    media_library: { name: 'disabled' },
    editor: { preview: false },
    collections: [{
      name: 'carta', label: 'Carta', label_singular: 'Carta', delete: false,
      editor: { preview: false },
      files: [{ name: 'productos', label: 'Administrar productos', file: 'src/data/products.json', format: 'json',
        fields: [{ name: 'products', label: 'Productos', widget: 'fusion-products', required: false }],
      }],
    }],
  };
}
