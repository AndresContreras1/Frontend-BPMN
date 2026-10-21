// Producción (Docker): nginx sirve la SPA y reenvía /api al backend, así que la URL es relativa.
export const environment = {
  // Indica que es el entorno de producción
  production: true,
  // URL base de la API; es relativa porque nginx hace el reenvío
  apiUrl: '/api/v1',
};
