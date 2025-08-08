import { Controller, Post, Body, Get, UseGuards, Request, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, NonceDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('nonce')
  async getNonce(@Body(ValidationPipe) nonceDto: NonceDto) {
    return this.authService.generateNonce(nonceDto);
  }

  @Post('verify')
  async verifySignature(@Body(ValidationPipe) authDto: AuthDto) {
    return this.authService.verifySignature(authDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return {
      address: req.user.address,
      authenticated: true,
    };
  }

  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'tuvcb-service-auth'
    };
  }
}
