export function notFound(_req, res) {
  res.status(404).json({ message: 'The requested resource was not found on this server.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({
    message: err.message || 'An unexpected error occurred. Please try again.',
    ...(err.errors ? { errors: err.errors } : {}),
  });
}
