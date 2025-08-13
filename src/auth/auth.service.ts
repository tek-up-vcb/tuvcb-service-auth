import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ethers } from 'ethers';
import { AuthDto, NonceDto } from './dto/auth.dto';
import { User } from '../entities/user.entity';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private nonces = new Map<string, { nonce: string; timestamp: number }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
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

      // Check if user exists in database and is active
      let user = await this.userRepository.findOne({
        where: { 
          walletAddress: recoveredAddress,
          isActive: true 
        }
      });

      if (!user) {
        // Try with case-insensitive search as fallback
        const userCaseInsensitive = await this.userRepository
          .createQueryBuilder('user')
          .where('LOWER(user.walletAddress) = LOWER(:address)', { address: recoveredAddress })
          .andWhere('user.isActive = :isActive', { isActive: true })
          .getOne();
        
        if (!userCaseInsensitive) {
          throw new UnauthorizedException('User not found or inactive');
        }
        
        // Use the case-insensitive result
        user = userCaseInsensitive;
      }

      // Remove used nonce
      this.nonces.delete(addressLower);

      // Generate JWT token with user information from the shared database
      const payload = { 
        address: recoveredAddress, 
        sub: recoveredAddress,
        userId: user.id, // Use the actual ID from the shared database
        id: user.id,     // Add 'id' field as well for consistency
        role: user.role,
        nom: user.nom,
        prenom: user.prenom,
        walletAddress: user.walletAddress
      };
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

  async validateUser(address: string): Promise<User | null> {
    try {
      let user = await this.userRepository.findOne({
        where: { 
          walletAddress: address,
          isActive: true 
        }
      });
      
      if (!user) {
        // Try with case-insensitive search as fallback
        user = await this.userRepository
          .createQueryBuilder('user')
          .where('LOWER(user.walletAddress) = LOWER(:address)', { address })
          .andWhere('user.isActive = :isActive', { isActive: true })
          .getOne();
      }
      
      return user;
    } catch (error) {
      return null;
    }
  }

  async getUserProfile(userId: string): Promise<any> {
    try {
      // Récupérer les informations depuis le service users
      const response = await firstValueFrom(
        this.httpService.get(`http://tuvcb-service-users:3002/api/users/${userId}`)
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile from users service:', error.message);
      
      // Fallback: récupérer depuis la base de données locale
      const user = await this.userRepository.findOne({
        where: { id: userId, isActive: true }
      });
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        walletAddress: user.walletAddress,
        isActive: user.isActive,
        address: user.walletAddress // Add address field for compatibility
      };
    }
  }
}
