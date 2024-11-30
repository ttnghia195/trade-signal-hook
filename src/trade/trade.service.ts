import { Inject, Injectable } from '@nestjs/common';
import Binance, { Binance as BinanceInstance } from 'binance-api-node';
import { TelegramService } from 'src/telegram/telegram.service';

const MAX_OPEN_ORDERS = 6;
const LEVERAGE = 5;

@Injectable()
export class TradeService {
  private readonly client: BinanceInstance;

  constructor(
    @Inject(TelegramService) private readonly telegramService: TelegramService,
  ) {
    this.client = Binance({
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
      httpFutures: 'https://testnet.binancefuture.com',
      wsFutures: 'wss://fstream.binancefuture.com',
    });
  }

  convertPair(pair: string): string {
    // Split the pair at ":" and "/"
    const mainPair = pair.split(':')[0];
    // Remove the "/" to concatenate the base and quote currency
    return mainPair.replace('/', '');
  }

  async getBalance(): Promise<{
    totalBalance: number;
    availableBalance: number;
  }> {
    try {
      // Get futures account balance
      const account = await this.client.futuresAccountInfo();
      const usdtAsset = account.assets.find((asset) => asset.asset === 'USDT');

      if (!usdtAsset) {
        throw new Error('USDT balance not found');
      }

      const totalBalance = parseFloat(usdtAsset.walletBalance); // Total balance
      const availableBalance = parseFloat(usdtAsset.availableBalance); // Available balance

      return { totalBalance, availableBalance };
    } catch (error) {
      console.error('Failed to get available balance:', error.message);
      this.telegramService.sendMessage(
        Number(process.env.TELEGRAM_CHAT_ID),
        `Failed to get available balance: ${error.message}`,
      );
    }
  }

  async getAllOpenOrders(): Promise<number> {
    try {
      // Get open orders
      const openOrders = await this.client.futuresOpenOrders({});

      return openOrders.length;
    } catch (error) {
      console.error('Failed to get open orders:', error.message);
      this.telegramService.sendMessage(
        Number(process.env.TELEGRAM_CHAT_ID),
        `Failed to get open orders: ${error.message}`,
      );
    }
  }

  async placeOrder(pair: string, rate: number): Promise<any> {
    try {
      const symbol = this.convertPair(pair);

      // Check if there are too many open orders
      const openOrders = await this.getAllOpenOrders();
      if (openOrders >= MAX_OPEN_ORDERS) {
        console.error('Too many open orders:', openOrders);
        this.telegramService.sendMessage(
          Number(process.env.TELEGRAM_CHAT_ID),
          `Too many open orders: ${openOrders}`,
        );
        return;
      }

      // Check available balance
      // Calculate the amount to buy
      const { totalBalance, availableBalance } = await this.getBalance();
      const amountPerTrade = Math.min(totalBalance, 100) / MAX_OPEN_ORDERS;
      const amount = Math.min(amountPerTrade, availableBalance) / rate;

      // Set leverage
      await this.client.futuresLeverage({
        symbol,
        leverage: LEVERAGE,
      });

      // Place order
      const marketOrder = await this.client.futuresOrder({
        symbol,
        side: 'BUY',
        type: 'MARKET',
        quantity: amount.toFixed(3),
      });

      // Calculate Take Profit and Stop Loss
      const takeProfitPrice = (rate + 1).toFixed(2); // 1% profit
      const stopLossPrice = (rate * 0.01).toFixed(2); // 99% loss

      // Place Take Profit order
      const takeProfitOrder = await this.client.futuresOrder({
        symbol,
        side: 'SELL',
        type: 'TAKE_PROFIT_MARKET',
        stopPrice: takeProfitPrice,
        quantity: amount.toFixed(3),
        priceProtect: 'TRUE',
      });

      // Place Stop Loss order
      const stopLossOrder = await this.client.futuresOrder({
        symbol,
        side: 'SELL',
        type: 'STOP_MARKET',
        stopPrice: stopLossPrice,
        quantity: amount.toFixed(3),
        priceProtect: 'TRUE',
      });

      console.log(
        'Placed orders:',
        marketOrder,
        takeProfitOrder,
        stopLossOrder,
      );
      this.telegramService.sendMessage(
        Number(process.env.TELEGRAM_CHAT_ID),
        `Buy ${amount.toFixed(3)} ${symbol} @ ${rate}\n` +
          `TP @ ${takeProfitPrice}, SL @ ${stopLossPrice}\n` +
          `Placed orders: ${marketOrder.orderId}, ${takeProfitOrder.orderId}, ${stopLossOrder.orderId}`,
      );
    } catch (error) {
      console.error('Failed to place orders:', error.message);
      this.telegramService.sendMessage(
        Number(process.env.TELEGRAM_CHAT_ID),
        `Failed to place orders: ${error.message}`,
      );
    }
  }
}
