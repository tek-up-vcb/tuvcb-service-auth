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
  async getProfile(@Request() req) {
    console.log('Profile request - JWT payload:', req.user);
    
    try {
      // Récupérer les informations complètes depuis le service users
      const userProfile = await this.authService.getUserProfile(req.user.userId);
      
      return {
        ...userProfile,
        authenticated: true,
      };
    } catch (error) {
      // Fallback avec les informations du JWT
      return {
        id: req.user.userId,
        address: req.user.address,
        role: req.user.role,
        nom: req.user.nom,
        prenom: req.user.prenom,
        walletAddress: req.user.address,
        authenticated: true,
      };
    }
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
