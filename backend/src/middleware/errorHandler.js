class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message;
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Corps JSON invalide';
  } else if (err.code === 'P2002') {
    statusCode = 409;
    message = 'Cette valeur existe déjà';
  } else if (err.code === 'P2003') {
    statusCode = 400;
    message = 'Référence associée invalide';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Ressource non trouvée';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      message: statusCode === 500 ? 'Erreur interne du serveur' : message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: `Route non trouvée: ${req.originalUrl}` } });
}

module.exports = { AppError, errorHandler, notFoundHandler };
