const db = require('./database.js');
db.all('SELECT * FROM pending_ilp_transfers', (err, rows) => {
  console.log(err || rows);
});
