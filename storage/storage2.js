/*
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");

function AlertError(err) {
	if (typeof (err) == "string") {
		console.log('Error: ', err);
	}
	else {
		switch (err.errno) {
			case 19:
				let unique_violations = err.toString().split('failed:').pop().split('\n')[0];
				console.log("Error: Repeated values on: " + unique_violations);
				break;
			default:
				console.log(err);
				break;
		}
	}
}

function modelToString(model, separator) {
	let condition = '';
	let keys = Object.keys(model);
	let values = Object.values(model);

	for (let i = 0; i < keys.length; i++) {
		condition += separator + ' ' + keys[i] + "='" + values[i] + "'";
	}
	return condition.substring(separator.length)
}

class Storage {
	constructor(databaseName = "database.db") {
		this.db = new sqlite3.Database(databaseName);

		this.PaymentOptions = new PaymentOptions(this);
		this.InboxOptions = new InboxOptions(this);
		this.Companies = new Companies(this);
		this.Sectors = new Sectors(this);
		this.Supliers = new Supliers(this);
		this.Expenses = new Expenses(this);
		// this.Configs = new this.Configs(this);
	}

	async initiate() {
		return new Promise((myResolve, myReject) => {

			this.db.serialize(() => {
				//Standalone tables
				//payment options
				this.run(`CREATE TABLE IF NOT EXISTS PaymentOptions (
					paymentID INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT UNIQUE NOT NULL
				)`)
				//Inboxes options
				this.run(`CREATE TABLE IF NOT EXISTS InboxOptions (
					inboxID INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT UNIQUE NOT NULL
				)`)
				//Companies
				this.run(`CREATE TABLE IF NOT EXISTS Companies (
					companyID INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT UNIQUE NOT NULL
				)`)

				//Dependent tables
				//Companies' sectors
				this.run(`CREATE TABLE IF NOT EXISTS Sectors (
					sectorID INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT NOT NULL,
					companyID INTEGER,
					FOREIGN KEY (companyID) REFERENCES Companies(companyID),
					UNIQUE(name, companyID)
				)`)
				//suppliers
				this.run(`CREATE TABLE IF NOT EXISTS Supliers (
					suplierID INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT UNIQUE NOT NULL,
					sectorID INTEGER,
					paymentID INTEGER,
					FOREIGN KEY (sectorID) REFERENCES Sectors(sectorID),
					FOREIGN KEY (paymentID) REFERENCES PaymentOptions(paymentID)
				)`)
				this.run(`CREATE TABLE IF NOT EXISTS Expenses (
					expenseID INTEGER PRIMARY KEY AUTOINCREMENT,
					value REAL NOT NULL,
					NF INTEGER NOT NULL,
					date DATE,
					modifDate Date DEFAULT DATE('now'),
					sectorID INTEGER,
					inboxID INTEGER,
					paymentID INTEGER,
					description TEXT DEFAULT '',
					FOREIGN KEY (sectorID) REFERENCES Sectors(sectorID),
					FOREIGN KEY (inboxID) REFERENCES InboxOptions(inboxID)
					FOREIGN KEY (paymentID) REFERENCES PaymentOptions(paymentID)
				)`)
			})
			myResolve();
		});
	}

	async run(sql, callback) {
		return new Promise((resolve) => {
			this.db.run(sql, [], (err) => {
				if (err) {
					AlertError(err);
				}
				resolve(err);
			})
		}).then((err) => {
			if (callback) {
				callback(err);
			}
		});
	}

	//will run perRowFunction for every row, and endFunction on ending
	async each(sql, perRowFunction, endFunction) {
		return new Promise(() => {
			this.db.each(
				sql,
				(err, row) => {
					perRowFunction(err, row)
				},
				(err, rowsTotal) => {
					endFunction(err, rowsTotal)
				}
			);
		});
	}

	//get a list of rows resulting from sql request
	//example parameter:
	//SELECT id, name FROM Sectors ORDER BY name
	async list(sql, callback) {
		return new Promise(() => {
			this.db.all(
				sql, [],
				(err, rows) => {
					if (err) {
						AlertError(err);
					}
					callback(err, rows);
				}
			);
		});
	}

	async get(table, condition, callback) {
		if (condition === '') {
			condition = "TRUE"
		}
		this.db.get('SELECT * FROM ' + table + ' WHERE ' + condition, [],
			(err, result) => {
				if (err) {
					AlertError(err);
				}
				if (!result) {
					err = new Error("No results on query");
					AlertError(err);
				}
				callback(err, result);
			})
	}

	async exists(table, condition, callback) {
		return this.list("SELECT * FROM " + table + " WHERE " + condition, (err, rows) => {
			if (err) {
				callback(err);
			}
			else {
				callback(err, (rows.length > 0));
			}
		})
	}

	async update(table, model, newValues, callback) {
		this.run(`
			UPDATE `+ table + `
			SET `+ modelToString(newValues, ",") + `
			WHERE `+ modelToString(model, "AND") + `;
		`, callback)
	}

	async add(table, value, callback) {
		let keys = Object.keys(value);
		keys.forEach(element => {
			let lookTable
			switch (element) {
				case 'PaymentID':
					lookTable = 'PaymentOptions'
					break;
				case 'InboxID':
					lookTable = 'InboxOptions'
					break;
				case 'CompanyID':
					lookTable = 'Companies'
					break;
				case 'SectorID':
					lookTable = 'Sectors'
					break;
				default:
					break;
			}
			if (lookTable) { }
		});
	}


	async setConfigs(configs = {
		nf_precision: 6,
	}) {
		let data = JSON.stringify(configs);
		return fs.writeFile('configs.json', data);
	}

	async getConfigs() {
		return fs.readFile('student.json', (err, data) => {
			if (err) throw err;
			let student = JSON.parse(data);
		});
	}

}

class PaymentOptions {
	constructor(storage) {
		this.storage = storage;
	}

	//Add a new Payment Option
	async add(PaymentOption, callback) {
		return this.storage.run(`
			INSERT INTO PaymentOptions(name)
			VALUES ('`+ PaymentOption.name + `');
			`, callback
		)
	}

	async update(model, newValues, callback) {
		this.storage.update("PaymentOptions", model, newValues, callback)
	}

	//get list of Payment Options
	async getAll(callback) {
		return this.storage.list('SELECT * FROM PaymentOptions', callback);
	}

}

class InboxOptions {
	constructor(storage) {
		this.storage = storage;
	}

	//Add a new Inbox Option
	async add(option, callback) {
		return this.storage.run(`
			INSERT INTO InboxOptions(name)
			VALUES ('`+ option.name + `');
			`,
			callback
		)
	}

	async update(model, newValues, callback) {
		this.storage.update("InboxOptions", model, newValues, callback)
	}

	//get list of Inbox Options
	async getAll(callback) {
		return this.storage.list('SELECT * FROM InboxOptions', callback);
	}

}

class Companies {
	constructor(storage) {
		this.storage = storage;
	}

	//Add a new Company
	async add(option, callback) {
		return this.storage.run(`
			INSERT INTO Companies(name)
			VALUES ('`+ option.name + `');
			`, callback
		);
	}

	async update(model, newValues, callback) {
		this.storage.update("Companies", model, newValues, callback)
	}

	//get list of Companies
	async getAll(callback) {
		return this.storage.list('SELECT * FROM Companies', callback);
	}

}

class Sectors {
	constructor(storage) {
		this.storage = storage;
	}

	//Add a new Sector
	async add(sector, callback) {
		return this.storage.exists("Companies", "companyID = " + sector.companyID, (err, result) => {
			if (err) {
				callback(err);
			}
			else if (result) {
				return this.storage.run(`
					INSERT INTO Sectors(name, companyID)
					VALUES ('`+ sector.name + `', '` + sector.companyID + `');
					`,
					callback
				)
			}
			else {
				let err = new Error("No companies with id " + sector.companyID)
				AlertError(err);
				callback(err);
			}
		})

	}

	async update(model, newValues, callback) {
		this.storage.update("Sectors", model, newValues, callback)
	}


	//get list of all Sectors
	async getAll(callback) {
		return this.storage.list('SELECT * FROM Sectors', callback);
	}

}

class Supliers {
	constructor(storage) {
		this.storage = storage;
	}

	//Add a new Suplier
	async add(suplier, callback) {
		return this.storage.exists("Sectors", "sectorID = " + suplier.sectorID, (err, result) => {
			if (err) {
				if (callback) {
					callback(err);
				}
			}
			else if (!result) {
				let err = new Error("No sector with id " + suplier.companyID)
				AlertError(err);
				if (callback) {
					callback(err);
				}
			}
			else {
				return this.storage.exists("PaymentOptions", "paymentID = " + suplier.paymentID, (err, result) => {
					if (err) {
						if (callback) {
							callback(err);
						}
					}
					else if (!result) {
						let err = new Error("No payment option with id " + suplier.paymentID)
						AlertError(err);
						if (callback) {
							callback(err);
						}
					}
					else {
						return this.storage.run(`
							INSERT INTO Supliers(name, sectorID, paymentID)
							VALUES ('`+ suplier.name + `', '` + suplier.sectorID + `', '` + suplier.paymentID + `');
							`,
							callback
						)
					}
				})
			}
		})

	}

	//get list of all Supliers
	async getAll(callback) {
		return this.storage.list('SELECT * FROM Supliers', callback);
	}

	async update(model, newValues, callback) {
		this.storage.update("Supliers", model, newValues, callback)
	}

	//get some suplier
	async get(model, callback) {
		let condition = modelToString(model, 'AND')

		return this.storage.get('Supliers', condition, callback);
	}
}

class Expenses {
	constructor(storage) {
		this.storage = storage;
	}

	//Add a new Expense
	async add(expense, callback) {
		return this.storage.exists("Sectors", "sectorID = " + expense.sectorID, (err, result) => {
			if (err) {
				if (callback) {
					callback(err);
				}
			}
			else if (!result) {
				let err = new Error("No sector with id " + expense.companyID)
				AlertError(err);
				if (callback) {
					callback(err);
				}
			}
			else {
				return this.storage.exists("PaymentOptions", "paymentID = " + expense.paymentID, (err, result) => {
					if (err) {
						if (callback) {
							callback(err);
						}
					}
					else if (!result) {
						let err = new Error("No payment option with id " + expense.paymentID)
						AlertError(err);
						if (callback) {
							callback(err);
						}
					}
					else {

						return this.storage.exists("InboxOptions", "paymentID = " + expense.InboxID, (err, result) => {
							if (err) {
								if (callback) {
									callback(err);
								}
							}
							else if (!result) {
								let err = new Error("No inbox option with id " + expense.paymentID)
								AlertError(err);
								if (callback) {
									callback(err);
								}
							}
							else {
								return this.storage.run(`
									INSERT INTO Expenses(value, NF, date, modifDate, sectorID, inboxID, paymentID, description)
									VALUES ('`+
									expense.value + `', '` +
									expense.NF + `', '` +
									expense.date + `', '` +
									expense.modifDate + `', '` +
									expense.sectorID + `', '` +
									expense.InboxID + `', '` +
									expense.paymentID + `', '` +
									expense.description +
									`');`,
									callback
								);
							}
						});
					}
				});
			}
		});

	}

	//get list of all Expenses with said condition object (can be empty)
	async getAll(conditionModel, callback) {
		let condition = modelToString(conditionModel);
		return this.storage.list('SELECT * FROM Supliers' + (condition === '' ? '' : 'WHERE ' + condition), callback);
	}

	async update(model, newValues, callback) {
		this.storage.update("Expenses", model, newValues, callback)
	}

	//get some expense
	async get(model, callback) {
		let condition = modelToString(model, 'AND')

		return this.storage.get('Supliers', condition, callback);
	}
}



module.exports = Storage;
*/