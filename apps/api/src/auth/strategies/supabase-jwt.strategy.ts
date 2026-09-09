import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { passportJwtSecret } from "jwks-rsa";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthUser } from "@common/types/auth-user.type";

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
  aal?: string;
}

/**
 * Valida o JWT emitido pelo Supabase Auth via JWKS público (RS256).
 * O NestJS nunca emite/assina tokens — atua apenas como resource server.
 * Ver specs/backend/common/jwt-auth-guard.md §8.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  "supabase-jwt",
) {
  constructor(config: ConfigService) {
    const supabaseUrl = config.get<string>("SUPABASE_URL");
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        cacheMaxAge: 10 * 60 * 1000,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri:
          config.get<string>("SUPABASE_JWKS_URL") ??
          `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
      algorithms: ["RS256"],
      issuer: `${supabaseUrl}/auth/v1`,
      audience: "authenticated",
      ignoreExpiration: false,
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<AuthUser> {
    if (!payload.sub) throw new UnauthorizedException();
    return {
      userId: payload.sub,
      email: payload.email ?? "",
      aal: payload.aal ?? "aal1",
    };
  }
}
