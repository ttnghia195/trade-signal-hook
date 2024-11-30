import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { TelegramService } from 'src/telegram/telegram.service';
import { TradeService } from './trade.service';

@Controller('trade')
export class TradeController {
  constructor(
    @Inject(TelegramService)
    private readonly telegramService: TelegramService,
    @Inject(TradeService)
    private readonly tradeService: TradeService,
  ) {}

  @Post('signal')
  async signal(
    @Body('pair') symbol: string,
    @Body('rate') rate: number,
  ): Promise<void> {
    this.telegramService.sendMessage(
      Number(process.env.TELEGRAM_CHAT_ID),
      `New signal: ${symbol} @ ${rate}`,
    );
    this.tradeService.placeOrder(symbol, rate);
  }

  @Get('balance')
  async balance(): Promise<void> {
    const { totalBalance, availableBalance: balance } =
      await this.tradeService.getBalance();
    this.telegramService.sendMessage(
      Number(process.env.TELEGRAM_CHAT_ID),
      `Total balance: ${totalBalance} USDT\nAvailable balance: ${balance} USDT`,
    );
  }

  @Get('open-orders')
  async openOrders(): Promise<void> {
    const openOrders = await this.tradeService.getAllOpenOrders();
    this.telegramService.sendMessage(
      Number(process.env.TELEGRAM_CHAT_ID),
      `Open orders: ${openOrders}`,
    );
  }
}
