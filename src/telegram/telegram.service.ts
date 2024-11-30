import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService {
  constructor(@InjectBot() private readonly bot: Telegraf) {}

  async sendMessage(chatId: number, message: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, message);
  }
}
