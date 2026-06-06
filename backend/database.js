// sqlite3 is required later, only if running locally
const path = require('path');

let db;

// 1. Check if we are running in production with a PostgreSQL database URL
if (process.env.DATABASE_URL) {
  console.log('Connecting to PostgreSQL database...');
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required by Render
  });

  // Helper to translate SQLite syntax to PostgreSQL syntax
  function convertToPostgres(sql) {
    let pgSql = sql;
    
    // Convert schema data types
    pgSql = pgSql.replace(/AUTOINCREMENT/gi, 'SERIAL');
    pgSql = pgSql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    pgSql = pgSql.replace(/BOOLEAN DEFAULT 0/gi, 'BOOLEAN DEFAULT false');
    
    // Ignore db.serialize since pg doesn't use it
    if (pgSql.includes('PRAGMA')) return null; // PG doesn't use pragmas
    
    // Convert parameter placeholders from ? to $1, $2...
    let paramCount = 1;
    pgSql = pgSql.replace(/\?/g, () => `$${paramCount++}`);
    
    return pgSql;
  }

  // Wrapper mimicking the sqlite3 API
  db = {
    serialize: (cb) => { if (cb) cb(); }, // No-op for pg
    run: (sql, params, cb) => {
      if (typeof params === 'function') { cb = params; params = []; }
      const pgSql = convertToPostgres(sql);
      if (!pgSql) { if (cb) cb(null); return; }
      
      pool.query(pgSql, params || [])
        .then(res => {
          if (cb) cb.call({ changes: res.rowCount, lastID: null }, null);
        })
        .catch(err => {
          console.error("PG run error:", pgSql, err.message);
          if (cb) cb.call({}, err);
        });
    },
    get: (sql, params, cb) => {
      if (typeof params === 'function') { cb = params; params = []; }
      const pgSql = convertToPostgres(sql);
      if (!pgSql) { if (cb) cb(null); return; }

      pool.query(pgSql, params || [])
        .then(res => {
          if (cb) cb(null, res.rows[0]);
        })
        .catch(err => {
          console.error("PG get error:", pgSql, err.message);
          if (cb) cb(err);
        });
    },
    all: (sql, params, cb) => {
      if (typeof params === 'function') { cb = params; params = []; }
      const pgSql = convertToPostgres(sql);
      if (!pgSql) { if (cb) cb(null); return; }

      pool.query(pgSql, params || [])
        .then(res => {
          if (cb) cb(null, res.rows);
        })
        .catch(err => {
          console.error("PG all error:", pgSql, err.message);
          if (cb) cb(err);
        });
    }
  };

  // Run schema initialization for PostgreSQL
  initSchema(db);

} else {
  // 2. Fallback to Local SQLite if no DATABASE_URL is set
  console.log('No DATABASE_URL found. Falling back to local SQLite...');
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, 'paylance.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      db.serialize(() => {
        initSchema(db);
      });
    }
  });
}

function initSchema(dbInstance) {
  // Create Users Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT,
    wallet_address TEXT,
    trust_score REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    company TEXT,
    bio TEXT,
    skills TEXT,
    hourly_rate REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create User Activities Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS user_activities (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action_type TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Create Jobs Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    employer_id TEXT,
    title TEXT,
    description TEXT,
    budget REAL,
    currency TEXT,
    deadline TEXT,
    skills TEXT,
    status TEXT DEFAULT 'open',
    freelancer_id TEXT,
    freelancer_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migrate existing jobs table (for SQLite backward compat, wrap in try/catch or ignore errors in PG)
  dbInstance.run(`ALTER TABLE jobs ADD COLUMN freelancer_id TEXT`, (err) => {});
  dbInstance.run(`ALTER TABLE jobs ADD COLUMN freelancer_name TEXT`, (err) => {});

  // Create Milestones Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS milestones (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    title TEXT,
    description TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(job_id) REFERENCES jobs(id)
  )`);
  
  dbInstance.run(`ALTER TABLE milestones ADD COLUMN deliverables TEXT`, (err) => {});
  dbInstance.run(`ALTER TABLE milestones ADD COLUMN acceptance_criteria TEXT`, (err) => {});

  // Create Applications Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    freelancer_id TEXT,
    cover_note TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id),
    FOREIGN KEY(freelancer_id) REFERENCES users(id)
  )`);

  // Create Matches Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    freelancer_id TEXT,
    freelancer_name TEXT,
    score REAL,
    reasoning TEXT,
    status TEXT DEFAULT 'matched',
    FOREIGN KEY(job_id) REFERENCES jobs(id)
  )`);

  // Create Chat Messages Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    sender_id TEXT,
    content TEXT,
    is_terms BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(job_id) REFERENCES jobs(id)
  )`);

  // Create Contracts Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    job_id TEXT,
    employer_id TEXT,
    freelancer_id TEXT,
    escrow_status TEXT DEFAULT 'pending',
    agreed_amount REAL,
    FOREIGN KEY(job_id) REFERENCES jobs(id)
  )`);

  // Create Deliverables Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS deliverables (
    id TEXT PRIMARY KEY,
    milestone_id TEXT,
    freelancer_id TEXT,
    content TEXT,
    ai_verification_score REAL,
    ai_verification_report TEXT,
    status TEXT DEFAULT 'submitted',
    FOREIGN KEY(milestone_id) REFERENCES milestones(id)
  )`);

  // Create Wallet Transactions Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    from_user_id TEXT,
    to_user_id TEXT,
    amount REAL,
    type TEXT,
    description TEXT,
    job_id TEXT,
    milestone_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create Pending ILP Transfers Table
  dbInstance.run(`CREATE TABLE IF NOT EXISTS pending_ilp_transfers (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    amount REAL,
    type TEXT,
    quote_id TEXT,
    continue_uri TEXT,
    continue_token TEXT,
    from_wallet TEXT,
    to_wallet TEXT,
    from_prefix TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

module.exports = db;
