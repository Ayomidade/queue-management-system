export const sendSuccess = (
  res,
  {
    statusCode = 200,
    message = "Request successful",
    data = null,
    meta = null,
  } = {},
) => {
  const payload = { status: "success", message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res,
  { statusCode = 500, message = "Something went wrong", errors = null } = {},
) => {
  const payload = { status: "error", message };
  if (errors !== null) payload.errors = errors;
  return res.status(statusCode).json(payload);
};
