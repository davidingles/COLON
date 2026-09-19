// Error de solicitud con el código HTTP que debe devolverse al cliente.

class ErrorSolicitud extends Error {
  constructor(mensaje, codigoHttp) {
    super(mensaje);
    this.name = 'ErrorSolicitud';
    this.codigoHttp = codigoHttp;
  }
}

module.exports = { ErrorSolicitud };
