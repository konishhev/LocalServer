const express = require('express');
const sqlite = require("sqlite3");
const bodyParser = require('body-parser');

const app = express()
const port = 3000

let jsonParser = bodyParser.json()

class Data {
    database
    serviceList = []
    clientList = []
    personalList = []
    statistics = []
    isShiftOpened = false

    constructor(){

        this.database = new sqlite.Database('./src/database.db', sqlite.OPEN_READWRITE, (err) => {
            if (err) return console.error(err)
            else console.log("DATABASE OPENED")
        })

        this.init();
    }

    init() {
        this.serviceList = []
        this.clientList = []
        this.personalList = []
        this.statistics = []

        this.database.serialize(() => {
            this.database.each(`SELECT id as id,
                 Service as service,
                 Price as price
                 FROM ServiceDatabase`, (err, row) => {
                if (err) console.log(err.message)
                this.serviceList.push({id: row.id, service: row.service, price: row.price})
            })
            this.database.each(`SELECT id as id,
                                Name as name,
                                Date as date,
                                ServiceID as sID,
                                Description as description
                                FROM ClientDatabase`, (err, row) => {
                if (err) console.log(err.message)
                this.clientList.push({id: row.id, name: row.name, date: row.date, sID: row.sID,
                    description: row.description})
            })
            this.database.each(`SELECT id as id,
                                Name as name,                                
                                Post as post
                                FROM PersonalDatabase`, (err, row) => {
                if (err) console.log(err.message)
                this.personalList.push({id: row.id, name: row.name, post: row.post})
            })
            this.database.each(`SELECT id as shiftID,
                                Date as date,
                                TotalIncome as totalIncome,
                                Cashbox as cashbox,
                                CashIncome as cashIncome,
                                Cashpayments as cashPayments,
                                TransferIncome as transferIncome,
                                Transferpayments as transferPayments,
                                CardIncome as cardIncome,
                                Cardpayments as cardPayments,
                                TotalPayments as totalPayments
                                FROM IncomeDatabase`, (err, row) => {
                if (err) console.log(err);
                this.statistics.push({
                    shiftID: row.shiftID,
                    date: row.date,
                    totalIncome: row.totalIncome,
                    cashbox: row.cashbox,
                    cashIncome: row.cashIncome,
                    cashPayments: row.cashPayments,
                    transferIncome: row.transferIncome,
                    transferPayments: row.transferPayments,
                    cardIncome: row.cardIncome,
                    cardPayments: row.cardPayments,
                    totalPayments: row.totalPayments
                })
            })
        })
    }

    insertIntoClientList(args) {
        const sql = `INSERT INTO ClientDatabase (id, Name, Date, ServiceID, Description)
                      VALUES (?, ?, ?, ?, ?)`
        const data = [args.id, args.name, args.date, args.sID, args.description]

        this.database.each(sql, data, err => {
            if (err) console.log(err)
        })
        this.init()
    }

    openShift() {
        this.isShiftOpened = true;
        const sql = `INSERT INTO IncomeDatabase (Date, TotalIncome, Cashbox, CashIncome, 
                            Cashpayments, CardIncome, Cardpayments, TransferIncome, 
                            Transferpayments, TotalPayments) 
                VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0)`

        const data = Date.now().toString()


        this.database.each(sql, data, (err) => {
            if (err) console.log(err);
        })
        this.init()
        console.log("SHIFT OPENED");
    }

    makeSail(args) {
        let sql, data;
        if (args.type === "CASH") {
            sql = `UPDATE IncomeDatabase SET TotalIncome=?, Cashbox=?, CashIncome=?, Cashpayments=?
                        WHERE id=?`
            data = [args.totalIncome, args.cashbox, args.cashIncome, args.cashPayments, args.shiftID]
        } else if (args.type === "TRANSFER") {
            sql = `UPDATE IncomeDatabase SET TotalIncome=?, TransferIncome=?, Transferpayments=?
                        WHERE id=?`
            data = [args.totalIncome, args.transferIncome, args.transferPayments, args.shiftID]
        } else if (args.type === "CARD") {
            sql = `UPDATE IncomeDatabase SET TotalIncome=?, CardIncome=?, Cardpayments=?
                        WHERE id=?`
            data = [args.totalIncome, args.cardIncome, args.cardPayments, args.shiftID]
        }

        this.database.each(sql, data, (err, result) => {
            if (err) console.log(err)
            console.log(result)
        })

        this.init()
    }

    closeShift() {
        this.isShiftOpened = false;
        console.log('SHIFT CLOSED')
        this.init()
    }

    getServiceList() {
        return this.serviceList
    }

    getClientList() {
        return this.clientList
    }

    getPersonalList() {
        return this.personalList
    }

    getStatistics() {
        return this.statistics.at(-1)
    }
}

const data = new Data()


app.get('/services', (req, res) => {
    res.json(data.getServiceList())
})

app.get('/stuff', (req, res) => {
    res.json(data.getPersonalList())
})

app.get('/clients', (req, res) => {
    res.json(data.getClientList())
})

app.get('/settings', (req, res) => {
    const settings = [{isShiftOpened: data.isShiftOpened, lastShiftId: data.getStatistics().shiftID}]
    if (data.isShiftOpened) {
        settings.push(data.getStatistics())
    }
    res.json(settings)
})

app.post('/clients', jsonParser, (req, res) => {
    data.insertIntoClientList(req.body);
    console.log(req.body)
    res.sendStatus(200);
})

app.post('/shift', (req, res) => {
    data.openShift()
    res.sendStatus(200)
})

app.post('/shift/close', (req, res) => {
    data.closeShift()
    res.sendStatus(200)
})

app.post('/sail', jsonParser, (req, res) => {
    data.makeSail(req.body)
    console.log(req.body)
    res.sendStatus(200)
})

app.listen(port, () => {
    console.log('LISTENING PORT ' + port)
})
