require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'paylance-super-secret-key-2025';

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Activity Tracker
const trackActivity = (userId, actionType, details = {}) => {
  const activityId = uuidv4();
  db.run(`INSERT INTO user_activities (id, user_id, action_type, details) VALUES (?, ?, ?, ?)`,
    [activityId, userId, actionType, JSON.stringify(details)],
    (err) => {
      if (err) console.error("Failed to track activity:", err.message);
    }
  );
};

// Interledger Open Payments logic
const ilpService = require('./services/ilpService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Socket.IO Logic
io.on('connection', (socket) => {
  console.log('User connected via Socket:', socket.id);

  // Users join their personal room for direct messages
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user_${userId}`);
  });

  // Chat message
  socket.on('send_message', async (data) => {
    // data: { sender_id, receiver_id, content }
    const messageId = uuidv4();
    try {
      // Save to database (we'll use a generic job_id='direct' since schema has job_id)
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO chat_messages (id, job_id, sender_id, content) VALUES (?, ?, ?, ?)`,
          [messageId, `direct_${data.receiver_id}`, data.sender_id, data.content],
          (err) => err ? reject(err) : resolve()
        );
      });
      
      const msgData = {
        id: messageId,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        content: data.content,
        created_at: new Date().toISOString()
      };

      // Emit to receiver
      io.to(`user_${data.receiver_id}`).emit('receive_message', msgData);
      // Emit back to sender
      socket.emit('receive_message', msgData);

    } catch (e) {
      console.error('Error saving chat message:', e);
    }
  });

  // WebRTC Video Call Signaling
  socket.on('join_video_room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user_joined_video', socket.id);
  });

  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', { offer: data.offer, sender: socket.id });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', { answer: data.answer, sender: socket.id });
  });

  socket.on('ice_candidate', (data) => {
    socket.to(data.roomId).emit('ice_candidate', { candidate: data.candidate, sender: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 0. AUTHENTICATION
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, company, skills, bio, hourlyRate, walletAddress } = req.body;
  const userId = uuidv4();

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Auto-generate ILP wallet pointer if not provided
    const finalWalletAddress = walletAddress || `$ilp.interledger-test.dev/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    db.run(`INSERT INTO users (id, name, email, password_hash, role, company, skills, bio, hourly_rate, wallet_address, trust_score, balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, passwordHash, role, company, JSON.stringify(skills || []), bio, hourlyRate || null, finalWalletAddress, 75.0, 0.0],
      (err) => {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        
        trackActivity(userId, 'USER_REGISTERED', { role });
        
        const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
          token,
          user: { id: userId, name, email, role, company, skills, bio, hourlyRate, walletAddress: finalWalletAddress, trustScore: 75.0, balance: 0.0 }
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    trackActivity(user.id, 'USER_LOGGED_IN');

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    // Clean up response
    delete user.password_hash;
    try { user.skills = JSON.parse(user.skills); } catch (e) {}
    
    res.json({ token, user });
  });
});

app.get('/api/users/me', authenticateToken, (req, res) => {
  db.get(`SELECT id, name, email, role, company, skills, bio, hourly_rate, wallet_address, trust_score, balance, created_at FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    try { user.skills = JSON.parse(user.skills); } catch (e) {}
    res.json(user);
  });
});

// ==========================================
// CHAT CONTACTS
// ==========================================
app.get('/api/contacts', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, name, role, email FROM users WHERE id != ? ORDER BY name ASC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ==========================================
// FREELANCER NETWORK — Real registered freelancers
// ==========================================
app.get('/api/freelancers', (req, res) => {
  db.all(
    `SELECT id, name, email, role, bio, skills, hourly_rate, trust_score, wallet_address, created_at 
     FROM users WHERE role = 'freelancer' ORDER BY trust_score DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const freelancers = rows.map(f => {
        try { f.skills = JSON.parse(f.skills); } catch (e) { f.skills = []; }
        return f;
      });
      res.json(freelancers);
    }
  );
});

// ==========================================
// ILP WALLET INFO — Fetch live wallet data from Interledger network
// ==========================================

// Get real ILP wallet info for the platform wallets (public, no auth needed)
app.get('/api/wallet/ilp-info', async (req, res) => {
  try {
    const [employerInfo, freelancerInfo] = await Promise.allSettled([
      ilpService.getWalletInfo(process.env.ILP_EMPLOYER_PAYMENT_POINTER),
      ilpService.getWalletInfo(process.env.ILP_FREELANCER_PAYMENT_POINTER),
    ]);

    res.json({
      employer: {
        pointer: process.env.ILP_EMPLOYER_PAYMENT_POINTER,
        info: employerInfo.status === 'fulfilled' ? employerInfo.value : null,
        connected: employerInfo.status === 'fulfilled' && !!employerInfo.value,
      },
      freelancer: {
        pointer: process.env.ILP_FREELANCER_PAYMENT_POINTER,
        info: freelancerInfo.status === 'fulfilled' ? freelancerInfo.value : null,
        connected: freelancerInfo.status === 'fulfilled' && !!freelancerInfo.value,
      },
      hasPrivateKeys: {
        employer: !!(process.env.ILP_EMPLOYER_PRIVATE_KEY && !process.env.ILP_EMPLOYER_PRIVATE_KEY.includes('BEGIN PUBLIC KEY')),
        freelancer: !!(process.env.ILP_FREELANCER_PRIVATE_KEY && !process.env.ILP_FREELANCER_PRIVATE_KEY.includes('BEGIN PUBLIC KEY')),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ILP balance for the current authenticated user
// Returns both Paylance DB balance and ILP wallet connection status
app.get('/api/wallet/ilp-balance', authenticateToken, async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(`SELECT id, name, role, balance, wallet_address FROM users WHERE id = ?`, [req.user.id], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Determine which ILP pointer belongs to this user's role
    let ilpPointer = user.wallet_address;

    // Try to fetch live ILP wallet info
    let ilpInfo = null;
    try {
      ilpInfo = await ilpService.getWalletInfo(ilpPointer);
    } catch (e) {
      // ILP fetch failed — still return DB balance
    }

    // Also fetch recent transactions
    const transactions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT wt.*, fu.name as from_name, tu.name as to_name
         FROM wallet_transactions wt
         LEFT JOIN users fu ON wt.from_user_id = fu.id
         LEFT JOIN users tu ON wt.to_user_id = tu.id
         WHERE wt.from_user_id = ? OR wt.to_user_id = ?
         ORDER BY wt.created_at DESC LIMIT 20`,
        [user.id, user.id],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    res.json({
      paylanceBalance: user.balance,
      ilpWalletPointer: ilpPointer,
      ilpWalletInfo: ilpInfo,
      ilpConnected: !!ilpInfo,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ==========================================
// WALLET FUNDING & WITHDRAWAL
// ==========================================
app.post('/api/wallet/fund', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
  
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 1. Execute ILP transfer from User to Platform
    const transferResult = await ilpService.depositToPaylance(user.role, amount);

    if (transferResult.requiresInteraction) {
      // Store pending transfer
      const pendingId = uuidv4();
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO pending_ilp_transfers (id, user_id, amount, type, quote_id, continue_uri, continue_token, from_wallet, to_wallet, from_prefix) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [pendingId, req.user.id, amount, 'DEPOSIT', transferResult.quoteId, transferResult.continueUri, transferResult.continueToken, transferResult.fromWallet, transferResult.toWallet, transferResult.fromPrefix],
          (err) => err ? reject(err) : resolve()
        );
      });
      return res.json({ requiresInteraction: true, interactUrl: transferResult.interactUrl });
    }

    // 2. Add to DB
    await new Promise((resolve, reject) => {
      db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [amount, req.user.id], (err) => err ? reject(err) : resolve());
    });

    trackActivity(req.user.id, 'FUNDS_DEPOSITED', { amount, tx: transferResult.transactionId });
    
    // 3. Record transaction
    const txId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO wallet_transactions (id, from_user_id, to_user_id, amount, type, description) VALUES (?, ?, ?, ?, ?, ?)`,
        [txId, req.user.id, 'PAYLANCE_PLATFORM', amount, 'DEPOSIT', `Deposited $${amount} via ILP`],
        (err) => err ? reject(err) : resolve()
      );
    });

    // 4. Return updated balance
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(`SELECT balance FROM users WHERE id = ?`, [req.user.id], (err, row) => err ? reject(err) : resolve(row));
    });

    res.json({ balance: updatedUser.balance, success: true, transferResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallet/withdraw', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
  
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.balance < amount) return res.status(400).json({ error: "Insufficient funds" });

    // 1. Execute ILP transfer from Platform to User
    const transferResult = await ilpService.withdrawFromPaylance(user.role, amount);

    if (transferResult.requiresInteraction) {
      // Store pending transfer
      const pendingId = uuidv4();
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO pending_ilp_transfers (id, user_id, amount, type, quote_id, continue_uri, continue_token, from_wallet, to_wallet, from_prefix) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [pendingId, req.user.id, amount, 'WITHDRAW', transferResult.quoteId, transferResult.continueUri, transferResult.continueToken, transferResult.fromWallet, transferResult.toWallet, transferResult.fromPrefix],
          (err) => err ? reject(err) : resolve()
        );
      });
      return res.json({ requiresInteraction: true, interactUrl: transferResult.interactUrl });
    }

    // 2. Deduct from DB
    await new Promise((resolve, reject) => {
      db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [amount, req.user.id], (err) => err ? reject(err) : resolve());
    });

    trackActivity(req.user.id, 'FUNDS_WITHDRAWN', { amount, tx: transferResult.transactionId });
    
    // 3. Record transaction
    const txId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO wallet_transactions (id, from_user_id, to_user_id, amount, type, description) VALUES (?, ?, ?, ?, ?, ?)`,
        [txId, 'PAYLANCE_PLATFORM', req.user.id, amount, 'WITHDRAWAL', `Withdrew $${amount} via ILP`],
        (err) => err ? reject(err) : resolve()
      );
    });

    // 4. Return updated balance
    const updatedUser = await new Promise((resolve, reject) => {
      db.get(`SELECT balance FROM users WHERE id = ?`, [req.user.id], (err, row) => err ? reject(err) : resolve(row));
    });

    res.json({ balance: updatedUser.balance, success: true, transferResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallet/continue', authenticateToken, async (req, res) => {
  const { interact_ref } = req.body;
  if (!interact_ref) return res.status(400).json({ error: "Missing interact_ref" });

  try {
    const pending = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM pending_ilp_transfers WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [req.user.id], (err, row) => err ? reject(err) : resolve(row));
    });

    if (!pending) return res.status(404).json({ error: "No pending ILP transfer found" });

    // Format pending data for completeGenericTransfer
    const pendingData = {
      amountUSD: pending.amount,
      quoteId: pending.quote_id,
      continueUri: pending.continue_uri,
      continueToken: pending.continue_token,
      fromWallet: pending.from_wallet,
      toWallet: pending.to_wallet,
      fromPrefix: pending.from_prefix,
      type: pending.type
    };

    const transferResult = await ilpService.completeGenericTransfer(pendingData, interact_ref);

    // Apply database updates
    if (pending.type === 'DEPOSIT') {
      await new Promise((resolve, reject) => {
        db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [pending.amount, req.user.id], (err) => err ? reject(err) : resolve());
      });
      trackActivity(req.user.id, 'FUNDS_DEPOSITED', { amount: pending.amount, tx: transferResult.transactionId });
      
      const txId = uuidv4();
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO wallet_transactions (id, from_user_id, to_user_id, amount, type, description) VALUES (?, ?, ?, ?, ?, ?)`,
          [txId, req.user.id, 'PAYLANCE_PLATFORM', pending.amount, 'DEPOSIT', `Deposited $${pending.amount} via ILP`],
          (err) => err ? reject(err) : resolve()
        );
      });
    } else if (pending.type === 'WITHDRAW') {
      await new Promise((resolve, reject) => {
        db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [pending.amount, req.user.id], (err) => err ? reject(err) : resolve());
      });
      trackActivity(req.user.id, 'FUNDS_WITHDRAWN', { amount: pending.amount, tx: transferResult.transactionId });
      
      const txId = uuidv4();
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO wallet_transactions (id, from_user_id, to_user_id, amount, type, description) VALUES (?, ?, ?, ?, ?, ?)`,
          [txId, 'PAYLANCE_PLATFORM', req.user.id, pending.amount, 'WITHDRAWAL', `Withdrew $${pending.amount} via ILP`],
          (err) => err ? reject(err) : resolve()
        );
      });
    }

    // Delete pending transfer
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM pending_ilp_transfers WHERE id = ?`, [pending.id], (err) => err ? reject(err) : resolve());
    });

    const updatedUser = await new Promise((resolve, reject) => {
      db.get(`SELECT balance FROM users WHERE id = ?`, [req.user.id], (err, row) => err ? reject(err) : resolve(row));
    });

    res.json({ balance: updatedUser.balance, success: true, transferResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific user's balance (used to confirm freelancer was credited)
app.get('/api/users/:id/balance', authenticateToken, (req, res) => {
  db.get(`SELECT id, name, balance FROM users WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ id: row.id, name: row.name, balance: row.balance });
  });
});

// ==========================================
// 1. JOBS & AI MATCHING
// ==========================================
app.post('/api/jobs', async (req, res) => {
  const { employer_id, employer_name, title, description, budget, currency, deadline, skills, milestones } = req.body;
  const jobId = uuidv4();

  try {
    // 1. Insert Job
    await new Promise((resolve, reject) => {
      db.run(`INSERT INTO jobs (id, employer_id, title, description, budget, currency, deadline, skills) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [jobId, employer_id, title, description, budget, currency, deadline, skills],
        (err) => err ? reject(err) : resolve()
      );
    });

    // 2. Insert Milestones — always generate fresh UUIDs to avoid UNIQUE constraint errors
    const createdMilestones = [];
    if (milestones && milestones.length > 0) {
      for (const ms of milestones) {
        const milestoneId = uuidv4(); // Never reuse IDs from frontend (mock always sends "m1")
        await new Promise((resolve, reject) => {
          db.run(`INSERT INTO milestones (id, job_id, title, description, amount, deliverables, acceptance_criteria) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [milestoneId, jobId, ms.title, ms.description, ms.amount, JSON.stringify(ms.deliverables || []), ms.acceptanceCriteria || ''],
            (err) => err ? reject(err) : resolve()
          );
        });
        createdMilestones.push({ ...ms, id: milestoneId });
      }
    }

    trackActivity(employer_id, 'JOB_CREATED', { jobId, title, budget });

    res.status(201).json({ success: true, jobId, milestones: createdMilestones, message: 'Job created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all open jobs (for freelancers to browse)
app.get('/api/jobs', (req, res) => {
  const { status, employer_id } = req.query;
  let query = `SELECT j.*, u.name as employer_name FROM jobs j LEFT JOIN users u ON j.employer_id = u.id`;
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push(`j.status = ?`);
    params.push(status);
  }
  if (employer_id) {
    conditions.push(`j.employer_id = ?`);
    params.push(employer_id);
  }

  if (conditions.length > 0) query += ` WHERE ` + conditions.join(' AND ');
  query += ` ORDER BY j.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get single job with milestones
app.get('/api/jobs/:id', (req, res) => {
  db.get(`SELECT j.*, u.name as employer_name FROM jobs j LEFT JOIN users u ON j.employer_id = u.id WHERE j.id = ?`, [req.params.id], (err, job) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    db.all(`SELECT * FROM milestones WHERE job_id = ?`, [req.params.id], (err2, milestones) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ ...job, milestones });
    });
  });
});

app.get('/api/jobs/:id/matches', (req, res) => {
  db.all(`SELECT * FROM matches WHERE job_id = ? ORDER BY score DESC`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==========================================
// JOB APPLICATIONS
// ==========================================

// Freelancer applies to a job
app.post('/api/jobs/:id/apply', authenticateToken, (req, res) => {
  const { cover_note } = req.body;
  const jobId = req.params.id;
  const freelancerId = req.user.id;

  // Check if already applied
  db.get(`SELECT id FROM applications WHERE job_id = ? AND freelancer_id = ?`, [jobId, freelancerId], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) return res.status(400).json({ error: 'You have already applied to this job' });

    const appId = uuidv4();
    db.run(
      `INSERT INTO applications (id, job_id, freelancer_id, cover_note) VALUES (?, ?, ?, ?)`,
      [appId, jobId, freelancerId, cover_note || ''],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        trackActivity(freelancerId, 'JOB_APPLIED', { jobId });
        res.status(201).json({ success: true, applicationId: appId });
      }
    );
  });
});

// Employer views all applicants for a job
app.get('/api/jobs/:id/applications', authenticateToken, (req, res) => {
  db.all(
    `SELECT a.id, a.cover_note, a.status, a.created_at,
            u.id as freelancer_id, u.name, u.email, u.bio, u.skills, u.hourly_rate, u.trust_score, u.wallet_address
     FROM applications a
     JOIN users u ON a.freelancer_id = u.id
     WHERE a.job_id = ?
     ORDER BY a.created_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const applications = rows.map(r => {
        try { r.skills = JSON.parse(r.skills); } catch(e) { r.skills = []; }
        return r;
      });
      res.json(applications);
    }
  );
});

// Check if current user has applied to a job
app.get('/api/jobs/:id/my-application', authenticateToken, (req, res) => {
  db.get(
    `SELECT * FROM applications WHERE job_id = ? AND freelancer_id = ?`,
    [req.params.id, req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || null);
    }
  );
});

// Employer accepts a specific applicant → starts contract
app.post('/api/jobs/:id/accept-applicant', authenticateToken, async (req, res) => {
  const { freelancer_id } = req.body;
  const jobId = req.params.id;

  try {
    // Get job to verify employer owns it
    const job = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM jobs WHERE id = ?`, [jobId], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.employer_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    // Get freelancer info
    const freelancer = await new Promise((resolve, reject) => {
      db.get(`SELECT id, name FROM users WHERE id = ?`, [freelancer_id], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!freelancer) return res.status(404).json({ error: 'Freelancer not found' });

    // Update job status and assign freelancer
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE jobs SET status = 'in_progress', freelancer_id = ?, freelancer_name = ? WHERE id = ?`,
        [freelancer_id, freelancer.name, jobId],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Mark application as accepted
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE applications SET status = 'accepted' WHERE job_id = ? AND freelancer_id = ?`,
        [jobId, freelancer_id],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Reject all other applicants
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE applications SET status = 'rejected' WHERE job_id = ? AND freelancer_id != ?`,
        [jobId, freelancer_id],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Set first milestone to in_progress
    await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM milestones WHERE job_id = ? ORDER BY id ASC LIMIT 1`, [jobId], (err, ms) => {
        if (err) return reject(err);
        if (ms) {
          db.run(`UPDATE milestones SET status = 'in_progress' WHERE id = ?`, [ms.id], (err2) => err2 ? reject(err2) : resolve());
        } else {
          resolve();
        }
      });
    });

    trackActivity(req.user.id, 'APPLICANT_ACCEPTED', { jobId, freelancer_id });

    res.json({ success: true, message: `${freelancer.name} has been hired`, freelancerName: freelancer.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// MILESTONE STATUS UPDATE
// ==========================================
app.post('/api/milestones/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  const milestoneId = req.params.id;
  // Normalize status to lowercase for DB consistency
  const dbStatus = (status || '').toLowerCase().replace('under_review', 'submitted');
  db.run(`UPDATE milestones SET status = ? WHERE id = ?`, [dbStatus, milestoneId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ success: true, milestoneId, status: dbStatus });
  });
});

// ==========================================
// 2. CHAT & TERMS
// ==========================================
app.post('/api/chat', (req, res) => {
  const { job_id, sender_id, content, is_terms } = req.body;
  const msgId = uuidv4();
  db.run(`INSERT INTO chat_messages (id, job_id, sender_id, content, is_terms) VALUES (?, ?, ?, ?, ?)`,
    [msgId, job_id, sender_id, content, is_terms ? 1 : 0],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      trackActivity(sender_id, 'MESSAGE_SENT', { msgId, job_id, is_terms });
      res.status(201).json({ success: true, messageId: msgId });
    }
  );
});

// ==========================================
// 3. ESCROW (INTERLEDGER)
// ==========================================
app.post('/api/escrow/lock', async (req, res) => {
  const { job_id, employer_id, freelancer_id, agreed_amount } = req.body;
  const contractId = uuidv4();
  
  try {
    const escrowResult = await ilpService.lockFunds(employer_id, agreed_amount);
    
    db.run(`INSERT INTO contracts (id, job_id, employer_id, freelancer_id, escrow_status, agreed_amount) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      [contractId, job_id, employer_id, freelancer_id, 'locked', agreed_amount],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ success: true, contractId, escrowResult });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ESCROW FUNDING — Deduct from employer wallet
// ==========================================
app.post('/api/escrow/fund', authenticateToken, async (req, res) => {
  const { job_id } = req.body;
  const employer_id = req.user.id;

  try {
    const job = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM jobs WHERE id = ?`, [job_id], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const employer = await new Promise((resolve, reject) => {
      db.get(`SELECT balance FROM users WHERE id = ?`, [employer_id], (err, row) => err ? reject(err) : resolve(row));
    });
    
    if (employer.balance < job.budget) {
      return res.status(400).json({ error: 'Insufficient wallet balance. Please fund your Paylance wallet first.' });
    }

    // Deduct total budget from employer
    await new Promise((resolve, reject) => {
      db.run(`UPDATE users SET balance = balance - ? WHERE id = ?`, [job.budget, employer_id], (err) => err ? reject(err) : resolve());
    });

    // The contracts table handles the escrow state below

    // Mark job escrow as FUNDED (We'll store it in a generic contracts table or just update something. For demo, we'll ensure a contract exists)
    const contractId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(`INSERT OR REPLACE INTO contracts (id, job_id, employer_id, freelancer_id, escrow_status, agreed_amount) 
              VALUES (COALESCE((SELECT id FROM contracts WHERE job_id = ?), ?), ?, ?, ?, 'FUNDED', ?)`,
        [job_id, contractId, job_id, employer_id, job.freelancer_id, job.budget],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Record transaction
    const txId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO wallet_transactions (id, from_user_id, to_user_id, amount, type, description, job_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [txId, employer_id, 'PAYLANCE_ESCROW', job.budget, 'ESCROW_FUNDING', `Escrow funded for job ${job_id}`, job_id],
        (err) => err ? reject(err) : resolve()
      );
    });

    trackActivity(employer_id, 'ESCROW_FUNDED', { job_id, amount: job.budget });

    res.json({ success: true, message: 'Escrow successfully funded from wallet.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ESCROW TRANSFER — Real money movement between wallets
// ==========================================
app.post('/api/escrow/transfer', authenticateToken, async (req, res) => {
  const { job_id, milestone_id, amount, freelancer_id } = req.body;
  const employer_id = req.user.id;

  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (!freelancer_id) return res.status(400).json({ error: 'Freelancer ID required' });

  try {
    // Credit to freelancer (The money is already in Escrow/Platform, so we do NOT deduct from Employer again)
    await new Promise((resolve, reject) => {
      db.run(`UPDATE users SET balance = balance + ? WHERE id = ?`, [amount, freelancer_id], (err) => err ? reject(err) : resolve());
    });

    // Update milestone status to paid
    if (milestone_id) {
      await new Promise((resolve, reject) => {
        db.run(`UPDATE milestones SET status = 'paid' WHERE id = ?`, [milestone_id], (err) => err ? reject(err) : resolve());
      });
      
      // Unlock the next milestone
      await new Promise((resolve, reject) => {
        // Find the lowest ID milestone that is still pending
        db.get(`SELECT id FROM milestones WHERE job_id = ? AND status = 'pending' ORDER BY id ASC LIMIT 1`, [job_id], (err, nextMs) => {
          if (err) return reject(err);
          if (nextMs) {
            db.run(`UPDATE milestones SET status = 'in_progress' WHERE id = ?`, [nextMs.id], (err2) => err2 ? reject(err2) : resolve());
          } else {
            resolve();
          }
        });
      });
    }

    // Record transaction
    const txId = uuidv4();
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO wallet_transactions (id, from_user_id, to_user_id, amount, type, description, job_id, milestone_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [txId, 'PAYLANCE_ESCROW', freelancer_id, amount, 'MILESTONE_PAYMENT', `Milestone payment released for job ${job_id}`, job_id, milestone_id || null],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Execute ILP payout (from Platform Escrow to Freelancer)
    const payoutResult = await ilpService.withdrawFromPaylance('freelancer', amount);

    // Get updated employer balance to send back
    const updatedEmployer = await new Promise((resolve, reject) => {
      db.get(`SELECT balance FROM users WHERE id = ?`, [employer_id], (err, row) => err ? reject(err) : resolve(row));
    });

    trackActivity(employer_id, 'MILESTONE_PAYMENT_RELEASED', { amount, freelancer_id, job_id, milestone_id });
    trackActivity(freelancer_id, 'MILESTONE_PAYMENT_RECEIVED', { amount, employer_id, job_id, milestone_id });

    res.json({
      success: true,
      transactionId: txId,
      amount,
      employerNewBalance: updatedEmployer.balance,
      payoutResult,
      message: `$${amount} successfully transferred via Interledger`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. DELIVERABLES & AI VERIFICATION
// ==========================================
app.post('/api/deliverables', async (req, res) => {
  const { milestone_id, freelancer_id, content } = req.body;
  const deliveryId = uuidv4();

  try {
    // 1. Fetch milestone details
    const milestone = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM milestones WHERE id = ?`, [milestone_id], (err, row) => {
        err ? reject(err) : resolve(row);
      });
    });

    if (!milestone) return res.status(404).json({ error: "Milestone not found" });

    // 2. AI Review
    const prompt = `You are an AI code/deliverable reviewer for a freelance platform. 
      Milestone requirements: "${milestone.title} - ${milestone.description}"
      Freelancer submission: "${content}"
      
      Review the submission against the milestone criteria.
      Output ONLY a valid JSON object with the following schema:
      {
        "score": 0.98,
        "report": "Detailed verification report with annotations on what was completed well."
      }`;

    let aiResult = { score: 0.9, report: "Looks good" };
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[0]);
      }
    } catch (aiErr) {
      console.error("AI Verification failed, falling back:", aiErr);
    }

    // 3. Save Deliverable
    await new Promise((resolve, reject) => {
      db.run(`INSERT INTO deliverables (id, milestone_id, freelancer_id, content, ai_verification_score, ai_verification_report) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        [deliveryId, milestone_id, freelancer_id, content, aiResult.score, aiResult.report],
        (err) => err ? reject(err) : resolve()
      );
    });

    // Update Milestone status
    db.run(`UPDATE milestones SET status = 'in_review' WHERE id = ?`, [milestone_id]);

    trackActivity(freelancer_id, 'MILESTONE_SUBMITTED', { deliveryId, milestone_id, aiScore: aiResult.score });

    res.status(200).json({ success: true, deliveryId, aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/milestones/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  try {
    await new Promise((resolve, reject) => {
      db.run(`UPDATE milestones SET status = ? WHERE id = ?`, [status.toLowerCase(), req.params.id], (err) => err ? reject(err) : resolve());
    });

    // Emit notification to employer
    if (status.toUpperCase() === 'APPROVED' || status.toUpperCase() === 'NEEDS_REVISION') {
      db.get(`SELECT jobs.employer_id, jobs.title FROM milestones JOIN jobs ON milestones.job_id = jobs.id WHERE milestones.id = ?`, [req.params.id], (err, job) => {
        if (!err && job) {
          const message = status.toUpperCase() === 'APPROVED' 
            ? `AI has APPROVED a milestone for ${job.title}. You can now release funds.`
            : `AI requested REVISIONS on a milestone for ${job.title}.`;
            
          io.to(`user_${job.employer_id}`).emit('notification', {
            title: 'Milestone Update',
            message: message,
            type: status.toUpperCase() === 'APPROVED' ? 'success' : 'warning'
          });
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. APPROVE & PAYOUT (INTERLEDGER)
// ==========================================
app.post('/api/escrow/payout', async (req, res) => {
  const { milestone_id, contract_id } = req.body;

  try {
    // Update Milestone
    await new Promise((resolve, reject) => {
      db.run(`UPDATE milestones SET status = 'approved' WHERE id = ?`, [milestone_id], (err) => err ? reject(err) : resolve());
    });

    const contract = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM contracts WHERE id = ?`, [contract_id], (err, row) => err ? reject(err) : resolve(row));
    });

    // Execute ILP Payout
    const payoutResult = await ilpService.executePayout(contract.freelancer_id, contract.agreed_amount);

    res.status(200).json({ success: true, message: 'Payout executed', payoutResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WALLET TRANSACTIONS HISTORY
// ==========================================
app.get('/api/wallet/transactions', authenticateToken, (req, res) => {
  db.all(
    `SELECT wt.*, 
            fu.name as from_name, 
            tu.name as to_name
     FROM wallet_transactions wt
     LEFT JOIN users fu ON wt.from_user_id = fu.id
     LEFT JOIN users tu ON wt.to_user_id = tu.id
     WHERE wt.from_user_id = ? OR wt.to_user_id = ?
     ORDER BY wt.created_at DESC
     LIMIT 50`,
    [req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ==========================================
// CHAT MESSAGES
// ==========================================
app.get('/api/chat/:userId', authenticateToken, (req, res) => {
  const otherUserId = req.params.userId;
  const currentUserId = req.user.id;
  
  db.all(
    `SELECT * FROM chat_messages 
     WHERE (sender_id = ? AND job_id = ?) 
        OR (sender_id = ? AND job_id = ?)
     ORDER BY created_at ASC`,
    [currentUserId, `direct_${otherUserId}`, otherUserId, `direct_${currentUserId}`],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

server.listen(PORT, () => {
  console.log(`Paylance backend running on port ${PORT}`);
});
