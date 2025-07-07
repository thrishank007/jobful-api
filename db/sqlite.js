const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'jobful.sqlite');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection with error handling
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ SQLite connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Handle database errors
db.on('error', (err) => {
  console.error('❌ SQLite database error:', err.message);
});

// Enable foreign keys and WAL mode for better performance
db.configure('busyTimeout', 3000);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;', (err) => {
  if (err) {
    console.error('❌ Failed to configure SQLite:', err.message);
  }
});

// Initialize tables if not exist
function initDB() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('❌ Failed to create jobs table:', err.message);
          return reject(err);
        }
      });
      
      // Job tracking table for notifications
      db.run(`CREATE TABLE IF NOT EXISTS job_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL UNIQUE,
        latest_job_id TEXT NOT NULL,
        latest_job_title TEXT NOT NULL,
        latest_job_board TEXT NOT NULL,
        latest_job_date TEXT NOT NULL,
        last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('❌ Failed to create job_tracking table:', err.message);
          return reject(err);
        }
        console.log('✅ Database tables initialized');
        resolve();
      });
    });
  });
}

function upsertJobs(type, jobs) {
  return new Promise((resolve, reject) => {
    if (!type || !jobs) {
      return reject(new Error('Type and jobs are required'));
    }

    const timeout = setTimeout(() => {
      reject(new Error('Database operation timeout'));
    }, 5000);

    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          clearTimeout(timeout);
          return reject(new Error(`Transaction start failed: ${err.message}`));
        }

        db.run('DELETE FROM jobs WHERE type = ?', [type], (err) => {
          if (err) {
            clearTimeout(timeout);
            db.run('ROLLBACK', () => {
              reject(new Error(`Delete failed: ${err.message}`));
            });
            return;
          }

          const stmt = db.prepare('INSERT INTO jobs (type, data) VALUES (?, ?)');
          stmt.run(type, JSON.stringify(jobs), (err) => {
            if (err) {
              clearTimeout(timeout);
              stmt.finalize();
              db.run('ROLLBACK', () => {
                reject(new Error(`Insert failed: ${err.message}`));
              });
              return;
            }

            stmt.finalize();
            db.run('COMMIT', (err) => {
              clearTimeout(timeout);
              if (err) {
                reject(new Error(`Commit failed: ${err.message}`));
              } else {
                resolve();
              }
            });
          });
        });
      });
    });
  });
}

function getJobs(type, offset = 0, limit = 20) {
  return new Promise((resolve, reject) => {
    if (!type) {
      return reject(new Error('Type is required'));
    }

    // Validate pagination parameters
    offset = Math.max(0, parseInt(offset) || 0);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const timeout = setTimeout(() => {
      reject(new Error('Database query timeout'));
    }, 5000);

    db.get('SELECT data FROM jobs WHERE type = ? ORDER BY updated_at DESC LIMIT 1', [type], (err, row) => {
      clearTimeout(timeout);
      if (err) {
        return reject(new Error(`Query failed: ${err.message}`));
      }
      
      if (!row) {
        return resolve({ total: 0, data: [] });
      }

      try {
        const allData = JSON.parse(row.data);
        const paged = allData.slice(offset, offset + limit);
        resolve({ total: allData.length, data: paged });
      } catch (parseError) {
        reject(new Error(`JSON parse error: ${parseError.message}`));
      }
    });
  });
}

// Job tracking for notification
function getLatestJobForCategory(category) {
  return new Promise((resolve, reject) => {
    if (!category) {
      return reject(new Error('Category is required'));
    }

    const timeout = setTimeout(() => {
      reject(new Error('Database query timeout'));
    }, 5000);

    db.get('SELECT * FROM job_tracking WHERE category = ?', [category], (err, row) => {
      clearTimeout(timeout);
      if (err) {
        return reject(new Error(`Query failed: ${err.message}`));
      }
      resolve(row);
    });
  });
}

// Update job tracking record
function updateJobTracking(category, latestJob) {
  return new Promise((resolve, reject) => {
    if (!category || !latestJob) {
      return reject(new Error('Category and latestJob are required'));
    }

    const timeout = setTimeout(() => {
      reject(new Error('Database operation timeout'));
    }, 5000);

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO job_tracking 
      (category, latest_job_id, latest_job_title, latest_job_board, latest_job_date, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    try {
      const jobId = `${latestJob.postBoard}-${latestJob.postName}-${latestJob.advtNo}`;
      stmt.run(category, jobId, latestJob.postName, latestJob.postBoard, latestJob.postDate, (err) => {
        clearTimeout(timeout);
        if (err) {
          stmt.finalize();
          return reject(new Error(`Update failed: ${err.message}`));
        }
        stmt.finalize();
        resolve();
      });
    } catch (error) {
      clearTimeout(timeout);
      stmt.finalize();
      reject(new Error(`Job tracking update failed: ${error.message}`));
    }
  });
}

// Graceful shutdown
function closeDB() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
        reject(err);
      } else {
        console.log('✅ Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = { db, initDB, upsertJobs, getJobs, getLatestJobForCategory, updateJobTracking, closeDB };
