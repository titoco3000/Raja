const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');


function AlertError(error) {
    console.log("Error Alert: {\n", error, "\n}");
}


class Storage {
    constructor(path = 'Raja.cfg') {
        this.configPath = path;
        console.log("storage initialized wtih configPath = ", this.configPath);
    }
    initiate(databaseLocation) {
        fs.mkdirSync(path.parse(databaseLocation).dir, { recursive: true });
        this.db = new Database(databaseLocation);
        try {
            //create all tables
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS PaymentOptions (
                    paymentID INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                );`
            ).run();
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS InboxOptions (
                    inboxID INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                );`
            ).run();
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS Companies (
                    companyID INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                );`
            ).run();
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS Sectors (
                    sectorID INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    companyID INTEGER NOT NULL,
                    FOREIGN KEY (companyID) REFERENCES Companies(companyID),
                    UNIQUE(name, companyID)
                );`
            ).run();
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS Supliers (
                    suplierID INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    sectorID INTEGER NOT NULL,
                    paymentID INTEGER NOT NULL,
                    inboxID INTEGER NOT NULL,
                    FOREIGN KEY (sectorID) REFERENCES Sectors(sectorID),
                    FOREIGN KEY (paymentID) REFERENCES PaymentOptions(paymentID),
                    FOREIGN KEY (inboxID) REFERENCES InboxOptions(inboxID)
                );`
            ).run();
            this.db.prepare(`
                CREATE TABLE IF NOT EXISTS Expenses (
                    expenseID INTEGER PRIMARY KEY AUTOINCREMENT,
                    value REAL NOT NULL,
                    NF INTEGER NOT NULL,
                    date DATE,
                    sectorID INTEGER NOT NULL,
                    inboxID INTEGER NOT NULL,
                    paymentID INTEGER NOT NULL,
                    suplierID INTEGER NOT NULL,
                    description TEXT DEFAULT '',
                    FOREIGN KEY (sectorID) REFERENCES Sectors(sectorID),
                    FOREIGN KEY (inboxID) REFERENCES InboxOptions(inboxID),
                    FOREIGN KEY (paymentID) REFERENCES PaymentOptions(paymentID),
                    FOREIGN KEY (suplierID) REFERENCES Supliers(suplierID)
                );`
            ).run();
        } catch (err) {
            throw err;
        }
    }

    run(sql, argsArray = []) {
        if (!this.db) {
            throw Error("Database was not initialized");
        }
        if (argsArray.constructor.name !== "Array") {
            throw Error("Invalid argsArray type (" + argsArray.constructor.name + ")");
        }
        return this.db.prepare(sql).run(...argsArray);
    }
    get(sql, argsArray = []) {
        if (!this.db) {
            throw Error("Database was not initialized");
        }
        if (argsArray.constructor.name !== "Array") {
            throw Error("Invalid argsArray type (" + argsArray.constructor.name + ")");
        }
        return this.db.prepare(sql).get(...argsArray);
    }

    all(sql, argsArray = []) {
        if (!this.db) {
            throw Error("Database was not initialized");
        }
        if (argsArray.constructor.name !== "Array") {
            throw Error("Invalid argsArray type (" + argsArray.constructor.name + ")");
        }
        return this.db.prepare(sql).all(...argsArray);
    }


    count(selection, args) {
        if (!this.db) {
            throw Error("Database was not initialized");
        }
        return this.get('SELECT COUNT(*) FROM ' + selection, args)['COUNT(*)'];
    }

    edit(table, selector, newValues) {
        if (!this.db) {
            throw Error("Database was not initialized");
        }
        if (this.count(table, selector) === 0) {
            throw Error('No value to edit');
        }
        let sql = 'UPDATE ' + table + ' SET ' + newValues + ' ' + selector;
        return this.db.prepare(sql).run();
    }
    delete(indentification, args, multiple = false) {
        if (!this.db) {
            throw Error("Database was not initialized");
        }
        let total = this.count(indentification, args);
        if (total === 0) {
            throw Error("No matching row to delete!");
        }
        else if (total > 1) {
            if (multiple) {
                console.log("Desleting multiple (" + total + ") rows");
            }
            else {
                throw Error("Too many matches (" + total + ") to delete!");
            }
        }
        return this.run('DELETE FROM ' + indentification + ';', args);
    }

    clearTable(table) {
        this.run(`DELETE FROM ` + table);
        this.run(`UPDATE sqlite_sequence SET seq=0 WHERE name=?;`, [table]);
    }

    getConfigs() {
        try {
            if (!fs.existsSync(path.dirname(this.configPath))) {
                return {};
            }
            return JSON.parse(fs.readFileSync(this.configPath))
        } catch (err) {
            return {};
        }
    }
    setConfigs(newConfigs) {
        try {
            let configs = this.getConfigs();
            console.log("received configs ", configs);
            Object.keys(newConfigs).forEach(key => {
                configs[key] = newConfigs[key]
            });

            if (!fs.existsSync(path.dirname(this.configPath))) {
                fs.mkdirSync(path.dirname(this.configPath));
            }

            fs.writeFileSync(this.configPath, JSON.stringify(configs, null, 2), { flag: 'w' });
        } catch (err) {
            console.error(err)
        }
    }

}

module.exports = Storage;