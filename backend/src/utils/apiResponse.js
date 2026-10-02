function successResponse(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

function errorResponse(
  res,
  code,
  message,
  statusCode = 400,
  details = undefined
) {
  const error = {
    code,
    message,
  };

  if (details !== undefined) {
    error.details = details;
  }

  return res.status(statusCode).json({
    success: false,
    error,
  });
}

module.exports = {
  successResponse,
  errorResponse,
};