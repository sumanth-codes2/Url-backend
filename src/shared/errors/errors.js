export class AppError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errors = []) {
    super(message, 400, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', errors = []) {
    super(message, 401, errors);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', errors = []) {
    super(message, 403, errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found', errors = []) {
    super(message, 404, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', errors = []) {
    super(message, 409, errors);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable Entity', errors = []) {
    super(message, 422, errors);
  }
}
