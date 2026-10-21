// Producción (Docker): nginx sirve la SPA y reenvía /api al backend, así que la URL es relativa.
export const environment = {
  production: true,
  apiUrl: '/api/v1',
};
