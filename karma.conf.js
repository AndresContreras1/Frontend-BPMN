// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

// Configuración de Karma, el ejecutor de las pruebas unitarias (los archivos *.spec.ts).
// Karma abre un navegador, carga las pruebas escritas con Jasmine y muestra los resultados.
module.exports = function (config) {
  config.set({
    // Carpeta base para resolver rutas relativas ('' = la raíz del proyecto)
    basePath: '',
    // jasmine: librería con describe/it/expect; build-angular: compila el código de Angular para las pruebas
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    // Plugins que Karma necesita cargar: framework, navegador, reportes y cobertura
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    // Cobertura de código: qué porcentaje del código ejecutan las pruebas. Se escribe en la carpeta coverage/
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/frontend-bpmn'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        // lcov.info es el formato que lee SonarCloud para la cobertura
        { type: 'lcovonly' }
      ]
    },
    // Formas de mostrar el resultado: progreso en la consola y reporte HTML en el navegador
    reporters: ['progress', 'kjhtml'],
    // Navegador donde se ejecutan las pruebas
    browsers: ['Chrome'],
    // En modo vigilancia, reinicia las pruebas al guardar un archivo
    restartOnFileChange: true
  });
};
