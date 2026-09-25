import { Router } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });
    
    (req.session as any).userId = user._id;
    res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error during registration" });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    (req.session as any).userId = user._id;
    res.status(200).json({ message: "Logged in successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error during login" });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Could not log out" });
    res.clearCookie('connect.sid');
    res.status(200).json({ message: "Logged out" });
  });
});

export default router;