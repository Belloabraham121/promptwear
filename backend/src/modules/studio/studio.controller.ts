import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ErrorCodes } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { CheckOwnership } from '../../common/decorators/ownership.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { RequestUser } from '../../common/types/request-user.type';
import { ChatService } from './chat.service';
import { GenerateDesignDto } from './dto/generate-design.dto';
import { SendChatDto } from './dto/send-chat.dto';
import { GenerateService } from './generate.service';

@Controller('designs')
export class StudioController {
  constructor(
    private readonly chatService: ChatService,
    private readonly generateService: GenerateService,
  ) {}

  @Get(':id/chat')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'design' })
  getChat(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.chatService.getHistory(user.sub, id);
  }

  @Post(':id/chat')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'design' })
  sendChat(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SendChatDto,
  ) {
    return this.chatService.sendMessage(user.sub, id, dto.text, dto.model, {
      generateImage: dto.generateImage,
      quality: dto.quality,
      size: dto.size,
    });
  }

  @Post(':id/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'design' })
  generate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: GenerateDesignDto,
  ) {
    return this.generateService.enqueue(
      user.sub,
      id,
      dto.panel,
      dto.quality,
      dto.size,
    );
  }

  /** Polled every ~1s while generating — must not share auth/studio quotas. */
  @Get(':id/generate/:jobId')
  @SkipThrottle()
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ resource: 'design' })
  getGenerateJob(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('jobId') jobId: string,
  ) {
    const job = this.generateService.getJob(user.sub, id, jobId);
    if (!job) {
      throw new AppException(
        ErrorCodes.NOT_FOUND,
        'Job not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return { job };
  }
}
