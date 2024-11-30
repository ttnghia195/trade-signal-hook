import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { TelegramModule } from './telegram/telegram.module';
import { TradeModule } from './trade/trade.module';

@Module({
  imports: [TelegramModule, TradeModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
