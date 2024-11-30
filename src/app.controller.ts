import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get(['', '/heath-check'])
  getHello(): string {
    return "I'm alive!";
  }
}
