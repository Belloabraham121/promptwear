import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestUser } from '../../common/types/request-user.type';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuotesService } from './quotes.service';

@Controller('orders')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('quote')
  createQuote(
    @CurrentUser() _user: RequestUser,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quotesService.createQuote(dto);
  }
}
