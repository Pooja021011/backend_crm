import { prisma } from '../config/db.js';
import { cryptoUtil, tokenUtil } from '../utils/crypto.js';
import { tokenRepository } from '../repositories/tokenRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { emailService } from './emailService.js';
import type { RoleName } from '@prisma/client';
import { createHash, randomInt } from 'node:crypto';

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || user.status !== 'active') throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    const ok = await cryptoUtil.verifyPassword(user.passwordHash, password);
    if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const roles = user.roles.map((ur) => ur.role.name as RoleName);
    const accessToken = tokenUtil.signAccess({ id: user.id, roles });
    const refreshToken = tokenUtil.signRefresh({ id: user.id, roles });

    await tokenRepository.create(user.id, hashToken(refreshToken), new Date(Date.now() + 30 * 24 * 3600 * 1000));

    // Include roles in the user object for frontend
    const userWithRoles = {
      ...user,
      roles: roles
    };

    return { user: userWithRoles, accessToken, refreshToken };
  },

  async refresh(refreshToken: string) {
    const decoded = tokenUtil.verifyRefresh(refreshToken);
    const valid = await tokenRepository.findValid(hashToken(refreshToken));
    if (!valid) throw Object.assign(new Error('Invalid token'), { status: 401 });

    const user = await userRepository.findById(decoded.id);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

    const roles = user.roles.map((ur) => ur.role.name as RoleName);
    const accessToken = tokenUtil.signAccess({ id: user.id, roles });
    
    // Include roles in the user object for frontend
    const userWithRoles = {
      ...user,
      roles: roles
    };
    
    return { user: userWithRoles, accessToken };
  },

  async logout(refreshToken: string) {
    await tokenRepository.revokeByTokenHash(hashToken(refreshToken));
  },

  async forgotPassword(email: string) {
    console.log('🔐 Forgot Password - Starting process for:', email);
    
    // Find user by email
    const user = await userRepository.findByEmail(email);
    if (!user) {
      console.log('❌ User not found for email:', email);
      // Don't reveal if email exists or not for security
      return { success: true, message: 'If the email exists, an OTP has been sent' };
    }

    console.log('✅ User found:', { userId: user.id, email: user.email });

    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();
    console.log('🔢 OTP generated:', otp);
    
    // Set OTP expiry to 10 minutes from now
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    console.log('⏰ OTP expiry set to:', otpExpiry);

    // Hash the OTP before storing
    const hashedOtp = hashToken(otp);
    console.log('🔐 OTP hashed, length:', hashedOtp.length);

    // Update user with OTP and expiry
    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          resetOtp: hashedOtp,
          resetOtpExpiry: otpExpiry,
        },
      });
      console.log('✅ Database updated successfully:', {
        userId: updatedUser.id,
        hasResetOtp: !!updatedUser.resetOtp,
        hasExpiry: !!updatedUser.resetOtpExpiry,
        expiryTime: updatedUser.resetOtpExpiry
      });
    } catch (dbError) {
      console.error('❌ Database update failed:', dbError);
      throw Object.assign(new Error('Failed to save OTP'), { status: 500 });
    }

    // Send OTP email
    try {
      console.log('📧 Attempting to send OTP email to:', email);
      await emailService.sendPasswordResetOTP(email, otp, user.firstName);
      console.log('✅ OTP email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      throw Object.assign(new Error('Failed to send OTP email'), { status: 500 });
    }

    console.log('✅ Forgot password process completed successfully');
    return { success: true, message: 'OTP sent to your email' };
  },

  async resetPassword(email: string, otp: string, newPassword: string) {
    console.log('🔐 Reset Password Request:', { email, otpLength: otp.length });
    
    // Find user by email
    const user = await userRepository.findByEmail(email);
    if (!user) {
      console.log('❌ User not found:', email);
      throw Object.assign(new Error('Invalid email or OTP'), { status: 400 });
    }

    console.log('✅ User found:', { userId: user.id, hasResetOtp: !!user.resetOtp, hasExpiry: !!user.resetOtpExpiry });

    // Check if OTP exists and is not expired
    if (!user.resetOtp || !user.resetOtpExpiry) {
      console.log('❌ No OTP found in database for user:', email);
      throw Object.assign(new Error('No OTP request found. Please request a new OTP'), { status: 400 });
    }

    const now = new Date();
    const expiry = new Date(user.resetOtpExpiry);
    console.log('⏰ OTP Expiry Check:', { now: now.toISOString(), expiry: expiry.toISOString(), expired: now > expiry });

    if (now > expiry) {
      console.log('❌ OTP expired');
      throw Object.assign(new Error('OTP has expired. Please request a new one'), { status: 400 });
    }

    // Verify OTP
    const hashedOtp = hashToken(otp);
    console.log('🔑 OTP Verification:', { 
      providedOtpHash: hashedOtp.substring(0, 10) + '...', 
      storedOtpHash: user.resetOtp.substring(0, 10) + '...',
      match: hashedOtp === user.resetOtp 
    });
    
    if (hashedOtp !== user.resetOtp) {
      console.log('❌ Invalid OTP');
      throw Object.assign(new Error('Invalid OTP'), { status: 400 });
    }

    console.log('✅ OTP verified successfully');

    // Hash new password
    const passwordHash = await cryptoUtil.hashPassword(newPassword);

    // Update password and clear OTP fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetOtp: null,
        resetOtpExpiry: null,
      },
    });

    // Revoke all existing refresh tokens for security
    await tokenRepository.revokeUser(user.id);

    return { success: true, message: 'Password reset successfully' };
  }
};

