import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ErrorCodes } from '../constants/error-codes';
import {
  OWNERSHIP_KEY,
  OwnershipMetadata,
} from '../decorators/ownership.decorator';
import { AppException } from '../exceptions/app.exception';
import { RequestUser } from '../types/request-user.type';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<OwnershipMetadata>(
      OWNERSHIP_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const userId = request.user?.sub;

    if (!userId) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const paramName = metadata.param ?? 'id';
    const rawId = request.params[paramName];
    const resourceId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!resourceId) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Resource not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const owned = await this.isOwned(metadata.resource, resourceId, userId);

    if (!owned) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Resource not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return true;
  }

  private async isOwned(
    resource: OwnershipMetadata['resource'],
    resourceId: string,
    userId: string,
  ): Promise<boolean> {
    switch (resource) {
      case 'design': {
        const design = await this.prisma.design.findFirst({
          where: { id: resourceId, userId },
          select: { id: true },
        });
        return design !== null;
      }
      case 'asset': {
        const asset = await this.prisma.asset.findFirst({
          where: { id: resourceId, userId },
          select: { id: true },
        });
        return asset !== null;
      }
      case 'order': {
        const order = await this.prisma.order.findFirst({
          where: { id: resourceId, userId },
          select: { id: true },
        });
        return order !== null;
      }
      default:
        return false;
    }
  }
}
