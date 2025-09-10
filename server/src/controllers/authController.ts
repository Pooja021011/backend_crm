import type { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { loginSchema } from '../validators/authValidators.js';

export const authController = {
  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.login(input.email, input.password);
    res
      .cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: 'lax', secure: false, path: '/api/v1/auth/refresh' })
      .json({ user: userSerializer(user), accessToken });
  },

  async refresh(req: Request, res: Response) {
    const token = (req.cookies?.refresh_token as string) || (req.body?.refreshToken as string);
    if (!token) return res.status(401).json({ error: 'Missing refresh token' });
    const { user, accessToken } = await authService.refresh(token);
    res.json({ user: userSerializer(user), accessToken });
  },

  async logout(req: Request, res: Response) {
    const token = (req.cookies?.refresh_token as string) || (req.body?.refreshToken as string);
    if (token) await authService.logout(token);
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' }).json({ success: true });
  },
};

function userSerializer(u: any) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    roles: u.roles?.map((r: any) => r.role.name) || [],
    status: u.status,
    createdAt: u.createdAt,
  };
}

