export const Roles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

export const Messages = {
  UNAUTHORIZED: 'Unauthorized: Invalid or missing token',
  FORBIDDEN: 'Forbidden: Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  INTERNAL_SERVER_ERROR: 'Internal server error occurred'
};

export const Limits = {
  MAX_AI_QUERIES_PER_DAY: 100,
  DEFAULT_PAGE_SIZE: 10
};
