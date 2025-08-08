import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { AuthDto, NonceDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private nonces = new Map<string, { nonce: string; timestamp: number }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  generateNonce(nonceDto: NonceDto): { nonce: string } {
    const { address } = nonceDto;
    
    if (!ethers.isAddress(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now();
    
    // Store nonce with 5 minutes expiration
    this.nonces.set(address.toLowerCase(), { nonce, timestamp });
    
    // Clean old nonces
    this.cleanExpiredNonces();
    
    return { nonce };
  }

  async verifySignature(authDto: AuthDto): Promise<{ access_token: string }> {
    const { address, signature, message } = authDto;

    if (!ethers.isAddress(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    const addressLower = address.toLowerCase();
    const storedNonce = this.nonces.get(addressLower);

    if (!storedNonce) {
      throw new UnauthorizedException('No nonce found for this address');
    }

    // Check if nonce is expired (5 minutes)
    if (Date.now() - storedNonce.timestamp > 5 * 60 * 1000) {
      this.nonces.delete(addressLower);
      throw new UnauthorizedException('Nonce expired');
    }

    // Verify that the message contains the nonce
    if (!message.includes(storedNonce.nonce)) {
      throw new UnauthorizedException('Invalid message format');
    }

    try {
      // Recover the address from the signature
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== addressLower) {
        throw new UnauthorizedException('Signature verification failed');
      }

      // Check if user is allowed (optional - you can remove this for any user)
      const allowedUser = this.configService.get<string>('ALLOWED_USER');
      if (allowedUser && recoveredAddress.toLowerCase() !== allowedUser.toLowerCase()) {
        throw new UnauthorizedException('User not authorized');
      }

      // Remove used nonce
      this.nonces.delete(addressLower);

      // Generate JWT token
      const payload = { address: recoveredAddress, sub: recoveredAddress };
      const access_token = this.jwtService.sign(payload);

      return { access_token };

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid signature');
    }
  }

  private cleanExpiredNonces() {
    const now = Date.now();
    const expireTime = 5 * 60 * 1000; // 5 minutes

    for (const [address, data] of this.nonces.entries()) {
      if (now - data.timestamp > expireTime) {
        this.nonces.delete(address);
      }
    }
  }

  validateUser(address: string): any {
    // This method can be used for additional user validation if needed
    return { address };
  }
}
