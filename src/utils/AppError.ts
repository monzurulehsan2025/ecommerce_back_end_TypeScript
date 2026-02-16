export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public isOperational: boolean = true
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, public details?: any) {
        super(message, 400);
    }
}

export class PaymentGatewayError extends AppError {
    constructor(message: string, public gatewayId: string) {
        super(message, 502);
    }
}

export class RiskServiceError extends AppError {
    constructor(message: string) {
        super(message, 403);
    }
}
