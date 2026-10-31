export interface BridgeConfig { baseUrl: string; clientId: string; gatewayUrl: string; authEndpoint: string; tokenEndpoint: string; statusEndpoint: string }
export function cmsConfig(bridge: BridgeConfig) {
  return {
    backend: {
      name: 'fusion-git-gateway', branch: 'main', auth_type: 'pkce',
      base_url: bridge.baseUrl, app_id: bridge.clientId, gateway_url: bridge.gatewayUrl,
      auth_endpoint: bridge.authEndpoint, auth_token_endpoint: bridge.tokenEndpoint,
      status_endpoint: bridge.statusEndpoint,
      commit_messages: { update: 'Actualizar carta de Fusión x8' },
    },
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
