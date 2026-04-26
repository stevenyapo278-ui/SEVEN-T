const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database/seven-t.db');

db.all("PRAGMA table_info(agents);", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
