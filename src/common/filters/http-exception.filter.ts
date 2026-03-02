// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const payload = exceptionResponse as Record<string, any>;
        message = payload.message ?? exception.message;
        details = payload.errors ?? payload.detail ?? payload.error;
      } else {
        message = exception.message;
      }

      this.logger.warn(`[${status}] ${Array.isArray(message) ? message.join(', ') : message}`);
      if (details) {
        this.logger.warn(`Details: ${JSON.stringify(details)}`);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = exception.message;
    } else {
      this.logger.error('Unknown error:', exception);
    }

    // ✅ ส่ง JSON เสมอ (ไม่ใช่ HTML)
    response.status(status).json({
      statusCode: status,
      message,
      details,
      timestamp: new Date().toISOString(),
    });
  }
}
