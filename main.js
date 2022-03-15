//imports
const path = require('path');
const os = require('os');
const { shell, dialog, app, BrowserWindow, Menu, ipcMain } = require('electron')
const fs = require("fs"); // Load the filesystem module
const slash = require('slash'); // to deal with windows' \\
//const log = require('electron-log'); //if you need logs
const Storage = require('./storage/storage.js');
const csv = require('fast-csv'); //to parse csv files on import
const internal = require('stream');

process.env.NODE_ENV = 'development'
app.commandLine.appendSwitch("lang", "pt-br");

const isDev = process.env.NODE_ENV !== 'production'
const isMac = process.platform === 'darwin'

let mainWindow
let aboutWindow
let storage = new Storage(path.join(app.getPath('appData'), 'Raja', 'Raja.cfg'));

function createMainWindow() {
	mainWindow = new BrowserWindow({
		title: 'My App',
		width: isDev ? 1000 : 500,
		height: 600,
		show: false,
		icon: `${__dirname}/assets/icons/Icon_256x256.png`,
		resizable: isDev,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		}
	})

	if (isDev) {
		mainWindow.webContents.openDevTools()
	}

	mainWindow.loadFile('./app/index.html')
}

function createAboutWindow() {
	aboutWindow = new BrowserWindow({
		title: 'About My App',
		width: 300,
		height: 300,
		icon: `${__dirname}/assets/icons/Icon_256x256.png`,
		resizable: false,
		autoHideMenuBar: true,
		webPreferences: {
			nodeIntegration: true,
		},
	})

	aboutWindow.loadFile('./app/about.html')
}

function getDefaultDataPath() {
	let baseName = path.join(app.getPath('documents'), 'Raja', 'rajaDatabase.sqlite');
	let sentName = baseName;
	let i = 1;
	while (fs.existsSync(sentName)) {
		let dotLocation = baseName.lastIndexOf('.');
		sentName = baseName.substring(0, dotLocation) + '(' + i + ')' + baseName.substring(dotLocation);
		i++;
	}
	return sentName;
}
//topbar menu
const menu = [
	{
		role: 'fileMenu',
	},
	{
		label: 'Help',
		submenu: [
			{
				label: 'Sobre',
				click: createAboutWindow
			}
		]
	},
	{
		label: 'Visualizar',
		submenu: [
			{ role: 'zoomIn' },
			{ role: 'zoomOut' },
		]
	},
	...(isDev ? [
		{
			label: 'Developer',
			submenu: [
				{ role: 'reload' },
				{ role: 'forcereload' },
				{ type: 'separator' },
				{ role: 'toggledevtools' },
				{
					label: 'abrir pasta das configs',
					click: () => {
						shell.showItemInFolder(storage.configPath);
					}
				}
			]
		}
	] : [])
]



app.on('ready', () => {
	createMainWindow()

	const mainMenu = Menu.buildFromTemplate(menu)
	Menu.setApplicationMenu(mainMenu)

	mainWindow.on('closed', () => mainWindow = null)

	mainWindow.once('ready-to-show', () => {
		mainWindow.show()
		//stuff to do on window start
	});

})

//	storage-related requests

//app requested configs
ipcMain.on('configs:get', async () => {
	console.log('Received configs request');
	mainWindow.webContents.send('configs:set', storage.getConfigs());
});

ipcMain.on('storage:initiate', (e, arg) => {
	storage.initiate(arg.path);
})

//app sent new database parameters
ipcMain.on('database:new', async (e, data) => {
	console.log("received set request with ", data);
	try {
		storage.initiate(data.saveLocation);

		storage.clearTable('Sectors')
		storage.clearTable('Companies')
		storage.clearTable('InboxOptions')
		storage.clearTable('PaymentOptions')

		data.companies.forEach(element => {
			storage.run(`
				INSERT INTO Companies(name) VALUES (?);
			`, [element]);
		});
		data.inboxOptions.forEach(element => {
			storage.run(`
				INSERT INTO InboxOptions(name) VALUES (?);
			`, [element]);
		});
		data.paymentOptions.forEach(element => {
			storage.run(`
				INSERT INTO PaymentOptions(name) VALUES (?);
			`, [element]);
		});
		data.sectors.forEach(element => {
			console.log(element);
			storage.run(`
				INSERT INTO Sectors(name, companyID) VALUES (?, ?);
			`, [element.name, element.companyID]);
		});
		storage.setConfigs({
			nfAccuracy: data.nfAccuracy,
			saveLocation: data.saveLocation
		});
		console.log("loading file");
		mainWindow.loadFile('./app/index.html')
	} catch (error) {
		console.log(error);
	}
});

ipcMain.on('storageSaveLocation:get', async () => {
	dialog.showSaveDialog(mainWindow, {
		title: 'Criar base de dados',
		buttonLabel: 'Confirmar',
		properties: ['promptToCreate'],
		defaultPath: getDefaultDataPath(),
		filters: [{ name: 'database', extensions: ['sqlite'] }]
	}).then((outcome) => {
		if (outcome.filePath != '') {
			mainWindow.webContents.send('defaultStoragePath:set', { path: outcome.filePath });
		}
	})
});

ipcMain.on('defaultStoragePath:get', async () => {
	console.log("got path request");
	mainWindow.webContents.send('defaultStoragePath:set', { path: getDefaultDataPath() });
});

ipcMain.on('storageSaveLocation:locate', async (data) => {
	dialog.showOpenDialog(mainWindow, {
		title: 'Localizar base de dados',
		buttonLabel: 'Confirmar',
		defaultPath: getDefaultDataPath(),
		filters: [{ name: 'database', extensions: ['sqlite'] }]
	}).then((outcome) => {
		console.log("outcome: ", outcome);
		if (outcome.filePaths != '') {
			console.log('filepath: ', outcome.filePaths);
			storage.setConfigs({
				nfAccuracy: data.nfAccuracy,
				saveLocation: outcome.filePaths
			});
			console.log("loading file");
			console.log(storage.getConfigs());
			mainWindow.loadFile('./app/index.html')
		}
	})
})

ipcMain.on('import:aldeia', async (e, data) => {

	if (fs.existsSync(slash(data.supliersPath)) && fs.existsSync(slash(data.expensesPath))) {
		console.log('data: ', data);
		mainWindow.loadFile('./app/loading.html')

		storage.initiate(slash(data.saveLocation));

		storage.clearTable('Supliers');
		storage.clearTable('Sectors');
		storage.clearTable('Companies');
		storage.clearTable('InboxOptions');
		storage.clearTable('PaymentOptions');

		fs.createReadStream(data.supliersPath)
			.pipe(csv.parse({ headers: false }))
			.on('error', error => {
				mainWindow.loadFile('./app/index.html')
				console.error(error)
			})
			.on('data', row => {
				let suplier = row[0];
				let company = row[1].split("_")[0];
				let sector = row[1].split("_").slice(1).join('');
				let payment = row[2];
				let inbox = row[3];
				try {
					storage.run('INSERT INTO PaymentOptions(name) VALUES (?)', [payment]);
				} catch (error) { if (error.code != 'SQLITE_CONSTRAINT_UNIQUE') { console.log(error); } }
				let paymentID = storage.get('SELECT paymentID FROM PaymentOptions WHERE name = ?;', [payment]).paymentID;
				try {
					storage.run('INSERT INTO InboxOptions(name) VALUES (?)', [inbox]);
				} catch (error) { if (error.code != 'SQLITE_CONSTRAINT_UNIQUE') { console.log(error); } }
				let inboxID = storage.get('SELECT inboxID FROM InboxOptions WHERE name = ?;', [inbox]).inboxID;
				try {
					storage.run('INSERT INTO Companies(name) VALUES (?)', [company]);
				} catch (error) { if (error.code != 'SQLITE_CONSTRAINT_UNIQUE') { console.log(error); } }
				let companyID = storage.get('SELECT companyID FROM Companies WHERE name = ?;', [company]).companyID;
				try {
					storage.run('INSERT INTO Sectors(name, companyID) VALUES (?, ?);', [sector, companyID]);
				} catch (error) { if (error.code != 'SQLITE_CONSTRAINT_UNIQUE') { console.log(error); } }
				let sectorID = storage.get('SELECT sectorID FROM Sectors WHERE name = ?;', [sector]).sectorID;
				try {
					storage.run('INSERT INTO Supliers(name, sectorID, paymentID, inboxID) VALUES (?, ? ,? ,?);', [suplier, sectorID, paymentID, inboxID]);
				} catch (error) { if (error.code != 'SQLITE_CONSTRAINT_UNIQUE') { console.log(error); } }

			})
			.on('end', rowCount => {
				console.log(`Parsed ${rowCount} rows`);
				fs.createReadStream(data.expensesPath)
					.pipe(csv.parse({ headers: false }))
					.on('error', error => {
						mainWindow.loadFile('./app/index.html')
						console.error(error)
					})
					.on('data', row => {
						console.log(row.length);
						if (row.length == 8) {
							let suplier = row[0];
							let company = row[1].split("_")[0];
							let sector = row[1].split("_").slice(1).join('');
							let date = row[2].split('/');
							date = '20' + date[2] + '-' + date[1] + '-' + date[0];
							let value = row[3];
							let payment = row[4];
							let nf = row[5];
							let inbox = row[6];
							let description = row[7];
							try {
								let suplierID = storage.get('SELECT suplierID FROM Supliers WHERE name = ?;', [suplier]).suplierID;
								let companyID = storage.get('SELECT companyID FROM Companies WHERE name = ?;', [company]).companyID;
								let sectorID = storage.get('SELECT sectorID FROM Sectors WHERE name = ? AND companyID = ?;', [sector, companyID]).sectorID;
								let paymentID = storage.get('SELECT paymentID FROM PaymentOptions WHERE name = ?;', [payment]).paymentID;
								let inboxID = storage.get('SELECT inboxID FROM InboxOptions WHERE name = ?;', [inbox]).inboxID;

								try {
									console.log(value, nf, date, sectorID, inboxID, paymentID, suplierID, description);
									storage.run(`
							INSERT INTO Expenses(value, NF, date, sectorID, inboxID, paymentID, suplierID, description) 
							VALUES (?, ?, ?, ?, ?, ?, ?, ?)
							`, [value, nf, date, sectorID, inboxID, paymentID, suplierID, description]);
								} catch (error) {
									console.log(error);
								}
							} catch (error) {
								console.log(error);
							}
						}

					})
					.on('end', rowCount => {
						console.log(`Parsed ${rowCount} rows`);
						storage.setConfigs({
							nfAccuracy: data.nfAccuracy,
							saveLocation: data.saveLocation
						});
						mainWindow.loadFile('./app/index.html')
					});
			});

	}
	else {
		console.log("the file did not exist!");
		mainWindow.loadFile('./app/index.html')
	}
})

ipcMain.on('expenses:get', (e, specs) => {
	console.log("received get expenses request with ", specs);
	let totalRows = storage.count('Expenses');
	let startIndex = Math.min(Math.max(0, specs.startIndex), totalRows - specs.quantity);
	console.log(`max row: ${totalRows}`);
	console.log(`max first index: ${totalRows - specs.quantity}`);
	mainWindow.webContents.send('viewTable:set', {
		startIndex: startIndex,
		content: storage.all(
			`
			SELECT 
				Expenses.date, 
				Expenses.NF, 
				Expenses.value, 
				Expenses.description, 
				InboxOptions.name AS inbox,
				PaymentOptions.name AS payment,
				Companies.name AS company,
				Sectors.name AS sector,
				Supliers.name AS suplier
			FROM Expenses
			INNER JOIN InboxOptions ON Expenses.inboxID=InboxOptions.inboxID
			INNER JOIN PaymentOptions ON Expenses.paymentID=PaymentOptions.paymentID
			INNER JOIN Sectors ON Expenses.sectorID=Sectors.sectorID
			INNER JOIN Companies ON Sectors.companyID=Companies.companyID
			INNER JOIN Supliers ON Expenses.suplierID=Supliers.suplierID
			ORDER BY ${specs.orderBy} LIMIT ${specs.quantity} OFFSET ${startIndex};
			`
		)
	});

});

ipcMain.on('expenses:add', async (e, expense) => {
	//check if all values are valid
	//suplier's name
	if (expense.suplier === '') {
		mainWindow.webContents.send('newExpense:result', { error: 'Fornecedor vazio', code: 0 });
		return;
	}
	//date
	var timestamp = Date.parse(expense.date);
	if (isNaN(timestamp) || timestamp < 0) {
		mainWindow.webContents.send('newExpense:result', { error: `Data invalida ${expense.date}`, code: 1 });
		return;
	}
	//nf
	if (isNaN(parseInt(expense.nf))) {
		mainWindow.webContents.send('newExpense:result', { error: `NF invalida ${expense.nf}`, code: 2 });
		return;
	}
	//value
	if (isNaN(parseFloat(expense.value))) {
		mainWindow.webContents.send('newExpense:result', { error: `Valor invalido ${expense.value}`, code: 3 });
		return;
	}
	//description
	expense.description = expense.description.replace('"', '').replace('\'', '');
	//sector
	if (storage.count('Sectors WHERE sectorID=?', [expense.sector]) === 0) {
		mainWindow.webContents.send('newExpense:result', { error: `Setor invalido ${expense.sector}`, code: 4 });
		return;
	}
	//payment
	if (storage.count('PaymentOptions WHERE paymentID=?', [expense.payment]) === 0) {
		mainWindow.webContents.send('newExpense:result', { error: `Pagamento invalido ${expense.payment}`, code: 5 });
		return;
	}
	//Inbox
	if (storage.count('InboxOptions WHERE inboxID=?', [expense.inbox]) === 0) {
		mainWindow.webContents.send('newExpense:result', { error: `Caixa invalido ${expense.inbox}`, code: 6 });
		return;
	}

	//check if the suplier exists
	//sector
	let matchingSuplier = storage.get('SELECT suplierID FROM Supliers WHERE name=?', [expense.suplier]);

	if (matchingSuplier) {
		//if yes, check if nf exists
		let matchingDate = storage.get('SELECT date FROM Expenses WHERE suplierID=? AND nf=?', [matchingSuplier.suplierID, expense.nf]);
		if (matchingDate) {
			let splitDate = matchingDate.date.split('-');
			//if yes, return and send failing message
			mainWindow.webContents.send('newExpense:result', { error: `Nota fiscal já usada em ${splitDate[2] + '/' + splitDate[1] + '/' + splitDate[0]}`, code: 7 });
			return;
		}
		//if no, update suplier to match
		storage.run('UPDATE Supliers SET sectorID=?, paymentID=?, inboxID=? WHERE suplierID=?', [expense.sector, expense.payment, expense.inbox, matchingSuplier.suplierID]);
	}
	else {
		//if no, add suplier
		storage.run('INSERT INTO Supliers(name, sectorID, paymentID, inboxID) VALUES (?, ? ,? ,?);', [expense.suplier, expense.sector, expense.payment, expense.inbox]);
		matchingSuplier = storage.get('SELECT suplierID FROM Supliers WHERE name=?', [expense.suplier]);
	}

	//add new expense
	console.log([expense.value, expense.nf, expense.date, expense.sector, expense.inbox, expense.payment, matchingSuplier, expense.description]);
	storage.run(`
		INSERT INTO Expenses(value, NF, date, sectorID, inboxID, paymentID, suplierID, description) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, [expense.value, expense.nf, expense.date, expense.sector, expense.inbox, expense.payment, matchingSuplier.suplierID, expense.description]);
	//send response
	mainWindow.webContents.send('newExpense:result', {});
});

ipcMain.handle('supliers:get', async () => {
	const result = storage.all(
		`
		SELECT 
			Supliers.name, 
			InboxOptions.name AS inbox,
			PaymentOptions.name AS payment,
			Companies.name AS company,
			Sectors.name AS sector,
			Supliers.name AS suplier
		FROM Supliers
		INNER JOIN InboxOptions ON Supliers.inboxID=InboxOptions.inboxID
		INNER JOIN PaymentOptions ON Supliers.paymentID=PaymentOptions.paymentID
		INNER JOIN Sectors ON Supliers.sectorID=Sectors.sectorID
		INNER JOIN Companies ON Sectors.companyID=Companies.companyID;
		`
	);
	return result;
});

ipcMain.handle('sectors:get', async () => {
	const result = storage.all(
		`
		SELECT 
			Sectors.sectorID, 
			Sectors.name,
			Companies.name AS company
		FROM Sectors
		INNER JOIN Companies ON Sectors.companyID=Companies.companyID;
		`
	);
	return result;
});

ipcMain.handle('inbox:get', async () => {
	const result = storage.all(
		`
		SELECT * FROM InboxOptions;
		`
	);
	return result;
});
ipcMain.handle('payment:get', async () => {
	const result = storage.all(
		`
		SELECT * FROM PaymentOptions;
		`
	);
	return result;
});
ipcMain.handle('suplier:check', (e, name) => {
	return result = storage.get(
		`
		SELECT SectorID, paymentID, inboxID FROM Supliers WHERE name=?;
		`, [name]
	);
});

