import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthDto } from "./dto";
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService, 
        private jwt: JwtService,
        private config: ConfigService
    ) {}

    async signup(dto: AuthDto) {
        // generate the password hash
        const hash = await argon.hash(dto.password);

        try {
            // save the new user into db
            const newUser = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    hash,
                },
            });

            delete newUser.hash;

            // return the saved user
            return newUser;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                // P2002 = error duplicate
                if (error.code === 'P2002') {
                    throw new ForbiddenException('Credentials already taken');
                }
            }

            throw error;
        }
    }

    async signin(dto: AuthDto) {
        // find the user by email
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
            },
        });
        
        // if user doesn't exist throw an exception
        if (!user) {
            throw new ForbiddenException('Invalid credentials');
        }

        // compare pssword
        const pwMatches = await argon.verify(
            user.hash,
            dto.password,
        );

        // if password incorrect throw an exception
        if (!pwMatches) {
            throw new ForbiddenException('Invalid password')
        }

        // send back the user
        // delete user.hash;
        return this.signToken(user.id, user.email);
    }

    async signToken(userId: number, email: string): Promise<{access_token: string}> {
        const payload = {
            sub: userId,
            email
        };

        const token = await this.jwt.signAsync(payload, {
            expiresIn: '45m',
            secret: this.config.get('JWT_SECRET')
        });

        return {
            access_token: token
        };
    }
}