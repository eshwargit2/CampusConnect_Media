const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const supabase = require('../supabase');

const router = express.Router();

// In-memory store for failed login attempts (locks for 5 hours after 5 failed attempts)
// Key: email (lowercased)
// Value: { attempts: number, lockUntil: number }
const loginAttempts = new Map();

// In-memory store for pending OTP registrations (expires in 10 minutes)
// Key: email (lowercased)
// Value: { username: string, passwordHash: string, bio: string, otp: string, expiresAt: number }
const pendingRegistrations = new Map();

// In-memory store for pending password resets (expires in 10 minutes)
// Key: email (lowercased)
// Value: { otp: string, expiresAt: number }
const pendingResets = new Map();

function checkLoginLock(email) {
    const emailKey = email.toLowerCase().trim();
    const record = loginAttempts.get(emailKey);
    if (record && record.lockUntil && record.lockUntil > Date.now()) {
        return { locked: true, lockUntil: record.lockUntil };
    }
    return { locked: false };
}

function recordLoginFailure(email) {
    const emailKey = email.toLowerCase().trim();
    const record = loginAttempts.get(emailKey) || { attempts: 0, lockUntil: 0 };
    record.attempts += 1;
    if (record.attempts >= 5) {
        record.lockUntil = Date.now() + 5 * 60 * 60 * 1000; // 5 hours
    }
    loginAttempts.set(emailKey, record);
    return record;
}

function recordLoginSuccess(email) {
    const emailKey = email.toLowerCase().trim();
    loginAttempts.delete(emailKey);
}

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'gmail.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── SMTP transporter (Brevo) ──────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendEmail({ to, subject, html }) {
    return transporter.sendMail({
        from: `"CampusConnect" <${process.env.SMTP_FROM || 'noreply@campusconnect.app'}>`,
        to, subject, html,
    });
}

function resetOtpEmailHtml(username, otp) {
    return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;">
      <div style="background:#FFE000;padding:24px 32px;border-bottom:5px solid #0a0a0a;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#0a0a0a;text-transform:uppercase;letter-spacing:2px;">
          🎓 CAMPUS<span style="color:#333;">CONNECT</span>
        </h1>
      </div>
      <div style="padding:32px;color:#f5f0e8;">
        <h2 style="font-size:18px;margin:0 0 16px;color:#FFE000;text-transform:uppercase;">Password Reset</h2>
        <p style="font-size:14px;line-height:1.7;margin:0 0 8px;color:#ccc;">
          Hi <strong style="color:#FFE000;">${username}</strong>,
        </p>
        <p style="font-size:14px;line-height:1.7;margin:0 0 24px;color:#ccc;">
          We received a request to reset your password. Please use the following One-Time Password (OTP) to verify your identity and reset your password:
        </p>
        <div style="background:#1a1a1a;padding:20px;text-align:center;border:2px dashed #FFE000;margin-bottom:24px;">
          <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#FFE000;font-family:'Courier New',monospace;">${otp}</span>
        </div>
        <p style="font-size:12px;line-height:1.7;margin:24px 0 0;color:#888;">
          This OTP is valid for <strong>10 minutes</strong>. If you didn't request this, ignore this email.
        </p>
      </div>
      <div style="background:#FFE000;padding:12px 32px;text-align:center;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#0a0a0a;text-transform:uppercase;">
          CAMPUSCONNECT — SECURE RESET
        </p>
      </div>
    </div>`;
}

function otpEmailHtml(otp) {
    return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;">
      <div style="background:#FFE000;padding:24px 32px;border-bottom:5px solid #0a0a0a;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#0a0a0a;text-transform:uppercase;letter-spacing:2px;">
          🎓 CAMPUS<span style="color:#333;">CONNECT</span>
        </h1>
      </div>
      <div style="padding:32px;color:#f5f0e8;">
        <h2 style="font-size:18px;margin:0 0 16px;color:#FFE000;text-transform:uppercase;">Email Verification</h2>
        <p style="font-size:14px;line-height:1.7;margin:0 0 24px;color:#ccc;">
          Thank you for signing up for CampusConnect! Please use the following One-Time Password (OTP) to verify your email and complete your registration:
        </p>
        <div style="background:#1a1a1a;padding:20px;text-align:center;border:2px dashed #FFE000;margin-bottom:24px;">
          <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#FFE000;font-family:'Courier New',monospace;">${otp}</span>
        </div>
        <p style="font-size:12px;line-height:1.7;margin:24px 0 0;color:#888;">
          This OTP is valid for <strong>10 minutes</strong>. If you did not request this verification, please ignore this email.
        </p>
      </div>
      <div style="background:#FFE000;padding:12px 32px;text-align:center;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#0a0a0a;text-transform:uppercase;">
          CAMPUSCONNECT — VERIFICATION
        </p>
      </div>
    </div>`;
}

// ─── REGISTER SEND OTP ───────────────────────────────────────────────────
router.post('/register-send-otp', async (req, res) => {
    const { email, username, password, bio } = req.body;

    if (!email || !username || !password)
        return res.status(400).json({ error: 'Email, username and password are required' });

    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`))
        return res.status(400).json({ error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` });

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.'
        });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    // Check database to verify username/email are not taken
    const { data: existingEmail } = await supabase.from('users').select('id').eq('email', normalizedEmail).single();
    if (existingEmail) return res.status(409).json({ error: 'An account with this email already exists' });

    const { data: existingUsername } = await supabase.from('users').select('id').ilike('username', cleanUsername);
    if (existingUsername && existingUsername.length > 0) return res.status(409).json({ error: 'Username is already taken' });

    // Hash password before saving to in-memory store
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    pendingRegistrations.set(normalizedEmail, {
        username: cleanUsername,
        passwordHash,
        bio: bio || '',
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    try {
        await sendEmail({
            to: normalizedEmail,
            subject: '🔐 Verify Your CampusConnect Account',
            html: otpEmailHtml(otp),
        });
        console.log(`📧 Registration OTP sent to: ${normalizedEmail}`);
        res.json({ message: 'OTP sent successfully! Check your inbox.' });
    } catch (mailErr) {
        console.error('Email send error:', mailErr.message);
        res.status(500).json({ error: 'Could not send verification email. Please try again.' });
    }
});

// ─── REGISTER VERIFY OTP ─────────────────────────────────────────────────
router.post('/register-verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp)
        return res.status(400).json({ error: 'Email and OTP are required' });

    const normalizedEmail = email.toLowerCase().trim();
    const pending = pendingRegistrations.get(normalizedEmail);

    if (!pending)
        return res.status(400).json({ error: 'No verification request found. Please request a new OTP.' });

    if (pending.expiresAt < Date.now()) {
        pendingRegistrations.delete(normalizedEmail);
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (pending.otp !== otp.trim())
        return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

    // OTP verified successfully. Now create the user in the database.
    const { data: newUser, error } = await supabase
        .from('users')
        .insert({
            email: normalizedEmail,
            username: pending.username,
            password_hash: pending.passwordHash,
            bio: pending.bio,
            profile_image: null,
        })
        .select('id, email, username, bio, profile_image, created_at')
        .single();

    if (error) {
        console.error('DB insert error:', error);
        return res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }

    // Clean up pending registration
    pendingRegistrations.delete(normalizedEmail);

    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: newUser, token });
});

// ─── REGISTER ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { email, username, password, bio } = req.body;

    if (!email || !username || !password)
        return res.status(400).json({ error: 'Email, username and password are required' });

    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`))
        return res.status(400).json({ error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` });

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.'
        });
    }

    const normalizedEmail = email.toLowerCase();
    const cleanUsername = username.trim();

    const { data: existingEmail } = await supabase.from('users').select('id').eq('email', normalizedEmail).single();
    if (existingEmail) return res.status(409).json({ error: 'An account with this email already exists' });

    const { data: existingUsername } = await supabase.from('users').select('id').ilike('username', cleanUsername);
    if (existingUsername && existingUsername.length > 0) return res.status(409).json({ error: 'Username is already taken' });

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: newUser, error } = await supabase
        .from('users')
        .insert({
            email: normalizedEmail,
            username: cleanUsername,
            password_hash: passwordHash,
            bio: bio || '',
            profile_image: null,
        })
        .select('id, email, username, bio, profile_image, created_at')
        .single();

    if (error) {
        console.error('DB insert error:', error);
        return res.status(500).json({ error: 'Failed to create account' });
    }

    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user: newUser, token });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password are required' });

    const emailClean = email.toLowerCase().trim();

    // Check if locked
    const lockStatus = checkLoginLock(emailClean);
    if (lockStatus.locked) {
        return res.status(429).json({
            error: 'Too many failed login attempts. This account is locked for 5 hours.',
            lockUntil: lockStatus.lockUntil
        });
    }

    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, username, bio, profile_image, password_hash, created_at')
        .eq('email', emailClean)
        .single();

    if (error || !user) {
        const record = recordLoginFailure(emailClean);
        if (record.attempts >= 5) {
            return res.status(429).json({
                error: 'Too many failed login attempts. This account is locked for 5 hours.',
                lockUntil: record.lockUntil
            });
        }
        return res.status(401).json({
            error: 'Invalid credentials',
            attemptsLeft: 5 - record.attempts
        });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
        const record = recordLoginFailure(emailClean);
        if (record.attempts >= 5) {
            return res.status(429).json({
                error: 'Too many failed login attempts. This account is locked for 5 hours.',
                lockUntil: record.lockUntil
            });
        }
        return res.status(401).json({
            error: 'Invalid credentials',
            attemptsLeft: 5 - record.attempts
        });
    }

    // Success - clear lockout state
    recordLoginSuccess(emailClean);

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
});

// ─── ME ───────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
        return res.status(401).json({ error: 'Not authenticated' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, username, bio, profile_image, created_at')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) return res.status(401).json({ error: 'User not found' });
        res.json({ user });
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();

    const { data: ourUser } = await supabase
        .from('users').select('id, username').eq('email', normalizedEmail).single();

    if (!ourUser) {
        // Return success response to prevent email enumeration
        return res.json({ message: 'If that email is registered, a password reset OTP has been sent.' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    pendingResets.set(normalizedEmail, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    console.log(`🔑 Reset OTP generated for ${normalizedEmail}: ${otp}`);

    try {
        await sendEmail({
            to: normalizedEmail,
            subject: '🔐 Reset Your CampusConnect Password',
            html: resetOtpEmailHtml(ourUser.username, otp),
        });
        console.log(`📧 Reset email sent to: ${normalizedEmail}`);
        res.json({ message: 'Password reset OTP sent! Check your inbox.' });
    } catch (mailErr) {
        console.error('Email send error:', mailErr.message);
        res.status(500).json({ error: 'Could not send email. Please try again later.' });
    }
});

// ─── VERIFY RESET OTP ────────────────────────────────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp)
        return res.status(400).json({ error: 'Email and OTP are required' });

    const normalizedEmail = email.toLowerCase().trim();
    const pending = pendingResets.get(normalizedEmail);

    if (!pending)
        return res.status(400).json({ error: 'No password reset request found. Please request a new OTP.' });

    if (pending.expiresAt < Date.now()) {
        pendingResets.delete(normalizedEmail);
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (pending.otp !== otp.trim())
        return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

    res.json({ message: 'OTP verified successfully.' });
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
        return res.status(400).json({ error: 'Email, OTP, and new password are required' });

    const normalizedEmail = email.toLowerCase().trim();
    const pending = pendingResets.get(normalizedEmail);

    if (!pending)
        return res.status(400).json({ error: 'No password reset request found. Please request a new OTP.' });

    if (pending.expiresAt < Date.now()) {
        pendingResets.delete(normalizedEmail);
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (pending.otp !== otp.trim())
        return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.'
        });
    }

    try {
        const newHash = await bcrypt.hash(newPassword, 12);
        const { error: dbErr } = await supabase
            .from('users')
            .update({ password_hash: newHash })
            .eq('email', normalizedEmail);

        if (dbErr) {
            console.error('DB password update error:', dbErr.message);
            return res.status(500).json({ error: 'Failed to update password. Try again.' });
        }

        // Clean up pending reset OTP
        pendingResets.delete(normalizedEmail);

        console.log(`🔐 Password reset successful for: ${normalizedEmail}`);
        res.json({ message: 'Password reset successfully! You can now login.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

module.exports = router;
