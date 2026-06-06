const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('paylance.db');
db.run("UPDATE milestones SET status = 'paid' WHERE status = 'approved' OR status = 'APPROVED'", function(err) {
  console.log(err ? err : 'Fixed ' + this.changes + ' milestones');
});
