const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const supabase = require('../supabase');

const router = express.Router();

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

function resetEmailHtml(username, resetLink) {
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
          We received a request to reset your password. Click the button below to set a new one:
        </p>
        <a href="${resetLink}" style="display:inline-block;background:#FFE000;color:#0a0a0a;padding:14px 28px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;border:3px solid #FFE000;">
          RESET PASSWORD →
        </a>
        <p style="font-size:12px;line-height:1.7;margin:24px 0 0;color:#888;">
          This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.
        </p>
      </div>
      <div style="background:#FFE000;padding:12px 32px;text-align:center;">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:3px;color:#0a0a0a;text-transform:uppercase;">
          CAMPUSCONNECT — SECURE RESET
        </p>
      </div>
    </div>`;
}

// ─── REGISTER ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    const { email, username, password, bio } = req.body;

    if (!email || !username || !password)
        return res.status(400).json({ error: 'Email, username and password are required' });

    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`))
        return res.status(400).json({ error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` });

    if (password.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const normalizedEmail = email.toLowerCase();

    const { data: existingEmail } = await supabase.from('users').select('id').eq('email', normalizedEmail).single();
    if (existingEmail) return res.status(409).json({ error: 'An account with this email already exists' });

    const { data: existingUsername } = await supabase.from('users').select('id').eq('username', username).single();
    if (existingUsername) return res.status(409).json({ error: 'Username is already taken' });

    const passwordHash = await bcrypt.hash(password, 12);

    const { data: newUser, error } = await supabase
        .from('users')
        .insert({
            email: normalizedEmail,
            username,
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

    const { data: user, error } = await supabase
        .from('users')
        .select('id, email, username, bio, profile_image, password_hash, created_at')
        .eq('email', email.toLowerCase())
        .single();

    if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

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

    const normalizedEmail = email.toLowerCase();

    const { data: ourUser } = await supabase
        .from('users').select('id, username').eq('email', normalizedEmail).single();

    if (!ourUser)
        return res.json({ message: 'If that email is registered, a reset link has been sent.' });

    const { error: createErr } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        password: crypto.randomBytes(32).toString('hex'),
    });

    if (createErr && !createErr.message?.includes('already been registered')) {
        console.error('Auth provision error:', createErr.message);
        return res.status(500).json({ error: 'Failed to initiate reset. Try again.' });
    }

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: { redirectTo: `${FRONTEND_URL}/reset-password` },
    });

    if (linkErr || !linkData?.properties?.action_link) {
        console.error('generateLink error:', linkErr?.message);
        return res.status(500).json({ error: 'Could not generate reset link. Try again.' });
    }

    const resetLink = linkData.properties.action_link;
    console.log(`🔑 Reset link generated for ${normalizedEmail}`);

    try {
        await sendEmail({
            to: normalizedEmail,
            subject: '🔐 Reset Your CampusConnect Password',
            html: resetEmailHtml(ourUser.username, resetLink),
        });
        console.log(`📧 Reset email sent to: ${normalizedEmail}`);
        res.json({ message: 'Password reset email sent! Check your inbox (and spam folder).' });
    } catch (mailErr) {
        console.error('Email send error:', mailErr.message);
        res.status(500).json({ error: 'Could not send email. Please try again later.' });
    }
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
    const { accessToken, newPassword } = req.body;

    if (!accessToken || !newPassword)
        return res.status(400).json({ error: 'Token and new password are required' });

    if (newPassword.length < 6)
        return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
        const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(accessToken);

        if (authErr || !authUser?.email)
            return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });

        const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(authUser.id, {
            password: newPassword,
        });
        if (updateAuthErr) {
            console.error('Supabase auth password update error:', updateAuthErr.message);
            return res.status(500).json({ error: 'Failed to reset password.' });
        }

        const newHash = await bcrypt.hash(newPassword, 12);
        const { error: dbErr } = await supabase
            .from('users')
            .update({ password_hash: newHash })
            .eq('email', authUser.email.toLowerCase());

        if (dbErr) {
            console.error('DB password update error:', dbErr.message);
            return res.status(500).json({ error: 'Password updated in auth but failed to sync. Contact support.' });
        }

        console.log(`🔐 Password reset successful for: ${authUser.email}`);
        res.json({ message: 'Password reset successfully! You can now login.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

module.exports = router;
