const express = require('express');
const bodyParser = require('body-parser');
const {Pool} = require('pg');
const {CONST} = require('./conts/conts');

const pool = new Pool({
    user : "postgres",
    password : "Eniyan007!",
    host : "localhost",
    port : "5432",
    database : "su_pilvi"
})

const app = express();

app.use(bodyParser.json());

app.get('/login',async (req,res)=>{
    var body = req.body;
    var client = await pool.connect();
    await client.query(`SELECT * FROM user_login WHERE email like '$1'`,[body.email])
    .then(db_res=>{
        if(db_res.rowCount === 0){
            res.status(403).send("no_user");
        }
        else{
            var row = db_res.rows[0];
            console.log(row);
            if(body.password === row.password){
                res.send(200);
            }
            else{
                res.status(403).send("unauthorized");
            }
        }
    })
    .catch(err=>{
        console.log(err.message);
        if(err.message.indexOf("") != -1){
            res.status(409).send("user already exists");
        }
    })
    client.release();
    res.status(200).send();
});

app.post('/signup',async (req,res)=>{
    body = req.body;
    var client = await pool.connect();
    await client.query(`INSERT INTO user_login (uname,email,password,iam) values($1,$2,$3,$4)`,[body.uname,body.email,body.password,body.iam])
    .then(db_res=>{
        console.log(db_res);
        res.send(200);
    })
    .catch(err=>{
        console.log(err.message);
        if(err.message.indexOf("duplicate key value violates unique constraint") != -1){
            res.status(409).send("user already exists");
        }
    })
    client.release();
    res.status(200).send();
});

app.get('/dashboard/:email',(req,res)=>{
    console.log(req.parm.email);
});

app.post('/dashboard/:email',(req,res)=>{
    console.log(req.parm.email);
});

app.listen(CONST.PORT,()=>{console.log("listening on port " + CONST.PORT)});
