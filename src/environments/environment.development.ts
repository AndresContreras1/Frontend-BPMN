// Desarrollo: `ng serve` reenvía /api a http://localhost:8090 con proxy.conf.json (sin CORS).
export const environment = {
  // Indica que no es el entorno de producción
  production: false,
  // URL base de la API; es relativa para que pase por el proxy
  apiUrl: '/api/v1',
};
