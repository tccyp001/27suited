import { parseCSV } from "./csv.js";
import { parseLog } from "./logparser.js";
import { plotLog } from "./logplotter.js";
import { plotPNL } from "./pnl.js";
import {playerList} from "./players.js"
import express, { json }   from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import Database from 'better-sqlite3';
// import fs from 'fs';
const app = express();
app.use(express.json());
function createTables(newdb) {
  newdb.exec(`
    create table balance_history (
        game_date int not null,
        player_name text not null,
        current_game_chips int,
        balance real not null,
        PRIMARY KEY (game_date, player_name)
    );

    create table history_data (
        game_date int not null,
        svg1 blob,
        svg2 blob,
        poker_now_log blob
    );
    `);
}

function getLastDs(db) {
  const stmt = db.prepare(`select max(game_date) as last_ds from balance_history`);
  const ret = stmt.get();
  if (ret !== null && ret.last_ds !== null) return ret.last_ds;
  return -1;
}

//compare whether two dates are in the same month
function compareMonth(ds, lastDs) {
  const d1 = new Date(ds);
  const d2 = new Date(lastDs);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

function getLastBalance(db, lastGameDate) {
  let newBalance = {};
  if (lastGameDate === -1) {
    return newBalance;
  }
  const stmt = db.prepare(`select game_date, player_name, current_game_chips, balance from balance_history h
    where game_date = ?`);
  const rows = stmt.all(lastGameDate);
  rows.forEach(row => {
    newBalance[row.player_name] = {
      "game_date": row.game_date, 
      "player_name": row.player_name, 
      "current_game_chips": row.current_game_chips, 
      "balance":row.balance}});
  return newBalance;
}

function getBalanceInRange(db, startDt, endDt) {
  let balance = {};
  // convert startDt to Date type
  // convert to yyyy-mm-dd
  const startDate = new Date(startDt).toISOString().split('T')[0];
  const endDate = new Date(endDt).toISOString().split('T')[0];

  const stmt = db.prepare(`select game_date, player_name, current_game_chips, balance from balance_history where DATE(game_date) BETWEEN  DATE(?) and DATE(?)`);
  const rows = stmt.all(startDate, endDate);
  rows.forEach(row => {
    if (balance[row.player_name] === undefined) {
      balance[row.player_name] = {};
    }

    balance[row.player_name][row.game_date] = {
      "game_date": row.game_date, 
      "player_name": row.player_name, 
      "current_game_chips": row.current_game_chips, 
      "balance":row.balance}});
  return balance;
}

function mergeBalance(oldBalance, currentGameInfo, ds) {
  let newBalance = {};
  playerList.forEach((player, i) => {
    let oldBalanceVal = oldBalance.hasOwnProperty(player) ? oldBalance[player].balance:0;
    let currentChips = currentGameInfo.hasOwnProperty(player) ? currentGameInfo[player].delta:0;
    newBalance[player] = {
      "game_date": ds, 
      "player_name": player, 
      "current_game_chips": currentChips, 
      "balance":oldBalanceVal + currentChips};
  });
  return newBalance;
}


function payOff(db) {
  let lastBalance = getLastBalance(db, -999);
  const updateStmt = db.prepare("REPLACE INTO  balance_history (player_name,game_date, current_game_chips, balance) values (?, -999, ?,?)");
  Object.values(lastBalance).forEach((rec, i) => {
    let newVal = rec.balance;
    if (newVal < -500 || newVal > 1000) {
      newVal = 0;
    }
    const info2 = updateStmt.run(rec.player_name, newVal, newVal);
    console.log(info2);
  });
}


function manualUpdateBalance(db, balanceMap) {
  const updateStmt = db.prepare("REPLACE INTO  balance_history (player_name,game_date, current_game_chips, balance) values (?, -999, ?,?)");
  Object.keys(balanceMap).forEach((key, i) => {
    const playName = key;
    const balance = balanceMap[key];
    const info2 = updateStmt.run(playName, balance,balance);
    console.log(info2);
  });

}

function updateBalance(db, currentGameInfo, ds) {
  const lastDs = getLastDs(db);
  // new month, pay off all players
  if (!compareMonth(ds, lastDs)) {
    payOff(db);
  }
  let lastBalance = getLastBalance(db, -999);
  let newBalance = mergeBalance(lastBalance, currentGameInfo, ds);
  const stmt = db.prepare("INSERT INTO balance_history (game_date, player_name, current_game_chips, balance) values (?,?,?,?)");
  const updateStmt = db.prepare("REPLACE INTO  balance_history (player_name,game_date, current_game_chips, balance) values (?, -999, ?,?)");
  Object.values(newBalance).forEach((rec, i) => {
    const info = stmt.run(rec.game_date, rec.player_name, rec.current_game_chips, rec.balance);
    console.log(info);
    const info2 = updateStmt.run(rec.player_name, rec.current_game_chips, rec.balance);
    console.log(info2);
  });
}

function initDb() {
  let db = openDb();
  createTables(db);
  db.close()
}

function openDb() {
  return new Database('./poker.db', { verbose: console.log });
}

app.listen(80, () =>
  console.log('Example app listening on port 80!'),
);

const upload = multer({ dest: 'uploads/' });

app.use(cors({
  origin: '*'
}));


app.use(express.static(path.join(path.resolve(), '../frontend/build')));

app.get('/getHistoryChart', (req, res) => {
  let db = openDb();
  const stmt = db.prepare(`select svg1, svg2, julianday(DATE(?)) - julianday(game_date) as diffd from history_data where julianday(game_date) - julianday(DATE(?)) < 1 and julianday(game_date) - julianday(DATE(?)) >= 0`);
  const rows = stmt.all(req.query.dt, req.query.dt, req.query.dt);
  let ret = {};
  rows.forEach(row => {
    ret = {
      "svg" :row.svg1,
      "svg2" : row.svg2,
    }
  });
  res.send(ret);

});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).send('No file uploaded.');
    return;
  }
  console.log(req.file.path);
  const lines = parseCSV(req.file.path).reverse();
  const data = parseLog(lines);
  const svgMainChart = plotLog(data);
  const svgLineChart = plotPNL(data.pnl);

  let ret = {
    "svg" :svgMainChart,
    "svg2" : svgLineChart,
    "balance": data
  }

  let db = openDb();

  let currentGameInfo = Object.fromEntries(data.players.map(i => [i.player, i]));
  updateBalance(db, currentGameInfo, data.startTime);


  const saveRawDataStmt = db.prepare("REPLACE INTO  history_data (game_date, svg1, svg2, poker_now_log) values (?, ?, ?,?)");
  const info = saveRawDataStmt.run(data.startTime, svgMainChart, svgLineChart, JSON.stringify(data));
  db.close()
  res.send(JSON.stringify(ret));
});

app.get('/', (req,res) => {
  res.sendFile(path.join(process.cwd(), 'frontend/build/index.html'));
});


app.get('/history', (req,res) => {
  let db = openDb();
  const balance = getBalanceInRange(db, req.query.startDt, req.query.endDt);
  res.send(JSON.stringify(balance));
  db.close();
});

app.get('/initDb', (req,res) => {
  initDb();
  res.send("initDb done");
});

app.get('/deleteDs', (req,res) => {
  let db = openDb();
  const stmt = db.prepare("DELETE FROM balance_history where game_date=?");
  stmt.run(req.ds);
  db.close();
  res.send("deleteDs done");
});

app.get('/deleteAll', (req,res) => {
  let db = openDb();
  const stmt = db.prepare("DELETE FROM balance_history where 1=1");
  stmt.run();
  const stmt2 = db.prepare("DELETE FROM balance_history where 1=1");
  stmt2.run();
  db.close();
  res.send("delete done");
});

app.post('/updateBalance', (req,res) => {
  let db = openDb();
  manualUpdateBalance(db, req.body);
  db.close();
  res.send("update balance done");
});
