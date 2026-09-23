import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  private verifyPassword(password: string, hash: string, salt: string, algorithm: string, workFactor: number): boolean {
    if (!salt || !workFactor || workFactor < 600000) {
      return false;
    }

    if (algorithm === 'PBKDF2-SHA256' || algorithm === 'PBKDF2-SHA512') {
      const digest = algorithm.split('-')[1].toLowerCase();
      const hashed = crypto.pbkdf2Sync(password, salt, workFactor, 64, digest).toString('hex');
      return hashed === hash;
    }
    
    return false;
  }

  async login(actorId: string, credential?: string) {
    if (!credential) {
      throw new UnauthorizedException('Credential required');
    }

    // Check if it's a chairman
    const chairman = await this.prisma.chairman.findUnique({
      where: { id: actorId },
      include: { companies: true },
    });

    if (chairman && chairman.credentialHash) {
      const isValid = this.verifyPassword(
        credential, 
        chairman.credentialHash, 
        chairman.credentialSalt, 
        chairman.hashAlgorithm || 'PBKDF2-SHA512', 
        chairman.workFactor
      );

      if (isValid) {
        return {
          access_token: await this.jwtService.signAsync({
            actorId: chairman.id,
            actorRole: 'CHAIRMAN',
            companyId: chairman.companies[0]?.id,
          }),
        };
      } else {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // Check if it's an employee
    const employee = await this.prisma.employee.findUnique({
      where: { id: actorId },
      include: { role: true },
    });

    if (employee && employee.credentialHash) {
      const isValid = this.verifyPassword(
        credential, 
        employee.credentialHash, 
        employee.credentialSalt, 
        employee.hashAlgorithm || 'PBKDF2-SHA512', 
        employee.workFactor
      );

      if (isValid) {
        let roleName = 'EMPLOYEE';
        if (employee.role?.accessLevel === 'MANAGEMENT') {
          roleName = 'MANAGEMENT';
        } else if (employee.role?.accessLevel === 'SYSTEM') {
          roleName = 'SYSTEM';
        }
        
        return {
          access_token: await this.jwtService.signAsync({
            actorId: employee.id,
            actorRole: roleName,
            companyId: employee.companyId,
          }),
        };
      } else {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    throw new UnauthorizedException('Invalid actor ID or missing credentials');
  }
}
