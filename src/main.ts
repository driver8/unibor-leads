import express from 'express';
import bodyParser from 'body-parser';

import sqlite3 from 'sqlite3';

const app = express();
const port = 5104;
const dbFileName = "leadsDB.sqlite3";

let db = null;
let server = null;

function openDB(_dbFileName){
	return new Promise((resolve, reject) => {
		const _db = new sqlite3.Database(_dbFileName, sqlite3.OPEN_READWRITE, (err) => {
			if (err) {
				return console.error(err.message);
				reject(null);
			}
			console.log('Connected to the in-memory SQlite database.');
			_db.run(
				`CREATE TABLE IF NOT EXISTS uleads (
				user_id INT,
				ts INT,
				type TINYINT,
				role VARCHAR(24),
				name VARCHAR(128),
				surname VARCHAR(128),
				patronymic VARCHAR(128),
				email VARCHAR(80),
				phone VARCHAR(24))`);
			resolve(_db);
		});
	})
}

function clickDB(obj){
	if (db){
		const ts = Math.round(Date.now()/1000);
		const {user_id, type, role, name, surname, patronymic, email, phone} = obj;
		console.log("click: ", [user_id, type, role, name, surname, patronymic, email, phone].join(";"));
		db.run(`INSERT INTO uleads VALUES(${user_id}, ${ts}, ${type}, "${role}", "${name}", "${surname}", "${patronymic}", "${email}", "${phone}")`);
	}
}

function getCSVByType(type : number = 2) : Promise<string>{
	let csvData = "";
	return new Promise( (resolve, reject) => {
		db.all(`SELECT * FROM uleads where type = ${type};`, (err, rows) =>{
			if (err){
				console.error(err);
				csvData = err.toString();
				reject(csvData);
			}else{
				for(const row of rows){
					//console.log(row);
					let typeText = "";
					switch (row.type){
						case 1:
							typeText = "клик по баннеру";
							break;
						case 2:
							typeText = "завяка на обучение";
							break;
					};
					const array = [(new Date(row.ts * 1000)).toLocaleString(),typeText, row.role, row.phone, row.email, row.name + ' ' + row.patronymic + ' ' + row.surname, row.user_id];
					csvData += array.map( _ => (_+"\t")).join(';') + "\n";
				}
			}
			resolve(csvData + "\n");
		});
	})
}

function filename() : string{
	const thisDay = new Date();
	return thisDay.getFullYear() + '-' + (thisDay.getMonth()+1).toString() + '-' + thisDay.getDate() +  '-' + thisDay.getHours() + thisDay.getMinutes() + thisDay.getSeconds();
}

function fillRoute(){
	app.put('/click', (request, response) => {
		request.body && clickDB(request.body);
		response.status(204).send('Hello world!');
	});

	app.get('/all', (request, response) => {
		//console.log(request.body);
		request.body && clickDB(request.body);
		response.status(204).send('Hello world!');
	});

	app.get('/clicks-csv', async (request, response) => {
		response.status(200);

		const csv : string = await getCSVByType(1);
		let csvData = Buffer.from(csv, 'utf-8');

		response.setHeader('Content-disposition', 'attachment; filename=' + 'clicks-'+filename()+'.csv');
		response.setHeader('Content-type', 'text/csv');
		response.setHeader('Content-length', csvData.length);

		response.write(csvData);
		response.end();
	});

	app.get('/leads-csv', async (request, response) => {
		response.status(200);

		const csv : string = await getCSVByType(2);
		let csvData = Buffer.from(csv, 'utf-8');

		response.setHeader('Content-disposition', 'attachment; filename=' + 'leads-' + filename() + '.csv');
		response.setHeader('Content-type', 'text/csv');
		response.setHeader('Content-length', csvData.length);

		response.write(csvData);
		response.end();
	});



	// res.setHeader('Content-disposition', 'attachment; filename=' + filename);
	// res.setHeader('Content-type', mimetype);
}


async function main(){
	app.use(bodyParser.json());
	fillRoute();
	db = await openDB(dbFileName);
	server = app.listen(port, () => console.log(`Running on port ${port}`))
	return server;
}

function cleanup(){
	return new Promise( (res, rej) => {
		console.log('Closing http server.');
		server.close((err) => {
			console.log('Http server closed.');
			res(err ? 1 : 0);
			//process.exit(err ? 1 : 0);
		});
	});
}

try{
	// process.on('SIGTERM', () => {
	// 	console.info('SIGTERM signal received.');
	// 	cleanup();
	// });
	process.on('exit', async () => {
		console.info('SIGKILL signal received.');
		await cleanup();
	});
	main();
}catch(e){
	console.error(e);
}

