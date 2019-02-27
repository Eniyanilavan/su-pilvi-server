const express = require('express');
const bodyParser = require('body-parser');
const {Pool} = require('pg');
const {CONST} = require('./conts/conts');
var AWS = require('aws-sdk');
var AWS_CREDS = require('./creds').creds;
AWS.config.update({region: 'us-east-1',accessKeyId:AWS_CREDS.accessKeyId,secretAccessKey:AWS_CREDS.secretAccessKey});
var cloudformation = new AWS.CloudFormation({apiVersion: '2010-05-15'});

const pool = new Pool({
    user : "postgres",
    password : "Eniyan007!",
    host : "localhost",
    port : "5432",
    database : "su_pilvi"
})

const app = express();

app.use(bodyParser.json({limit:"50mb"}));

app.use((req,res,next)=>{
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Methods","GET,POST");
    res.setHeader("Access-Control-Allow-Headers","Content-Type");
    next();
})

app.get('/login',async (req,res)=>{
    console.log("login hit");
    var body = req.query;
    var client = await pool.connect();
    await client.query(`SELECT * FROM user_login WHERE email like $1`,[body.email])
    .then(db_res=>{
        if(db_res.rowCount === 0){
            res.status(404).send("no_user");
        }
        else{
            var row = db_res.rows[0];
            if(body.password === row.password){
                res.sendStatus(200);
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
});

app.post('/save',async (req,res)=>{
    var body = req.body;
    console.log("save_hit");
    var client = await pool.connect();
    await client.query(`UPDATE templates SET json = $1, preview = $4 WHERE email = $2 AND name = $3`,[body.json,body.email,body.name,body.svg])
    .then(db_res=>{
        if(db_res.rowCount === 1){
            res.sendStatus(200);
        }
        else{
            res.sendStatus(500);
        }
    })
    .catch(err=>{
        console.log(err);
        res.sendStatus(500);
    })
    client.release();
});

app.post("/deploy",(req,res)=>{
    console.log("request recieved");
    console.log(req.body);
    var params = {
        StackName: 'CapsuleCorp1', /* required */
        Capabilities: [
            "CAPABILITY_IAM",
            "CAPABILITY_NAMED_IAM" 
          ],
        OnFailure: "DELETE",
        TemplateBody: req.body.yaml,
      };
      cloudformation.createStack(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
      });
});

app.post('/signup',async (req,res)=>{
    console.log("signup hit");
    body = req.body;
    var client = await pool.connect();
    await client.query(`INSERT INTO user_login (uname,email,password,iam) values($1,$2,$3,$4)`,[body.uname,body.email,body.password,body.iam])
    .then(db_res=>{
        res.sendStatus(200);
    })
    .catch(err=>{
        console.log(err.message);
        if(err.message.indexOf("duplicate key value violates unique constraint") != -1){
            res.status(409).send("already exists");
        }
    })
    client.release();
});

app.get('/dashboard/:email',async (req,res)=>{
    var body = req.body;
    console.log("archs get hit");
    var client = await pool.connect();
    await client.query(`SELECT * FROM templates WHERE email LIKE $1`,[req.params.email])
    .then(rows=>{
        if(rows.rowCount === 0){
            res.sendStatus(404);
        }
        else{
            res.status(200).send(JSON.stringify({count:rows.rowCount,archs:rows.rows}));
        }
    })
    .catch(err=>{
        res.send(500)
    })
    client.release();
});

app.post('/dashboard/:email',async (req,res)=>{
    // if(req.params.email.match(/^(a-zA-Z0-9)+/g))
    var body = req.body;
    console.log("archs post hit");
    var client = await pool.connect();
    await client.query(`SELECT * FROM templates WHERE email LIKE $1 AND name LIKE $2`,[req.params.email,req.body.name])
    .then(async rows=>{
        if(rows.rowCount === 0){
            var ins_arch = await pool.connect();
            await ins_arch.query(`INSERT INTO templates (email,name,doc) VALUES($1,$2,$3)`,[req.params.email,req.body.name,req.body.doc])
            .then(ins_rows=>{
                res.status(200).send();
            })
            .catch(err=>{
                res.status(500).send();
                console.log(err.message);
            })
            ins_arch.release();
        }
        else{
            res.status(409).send("already_exists");
        }
    })
    .catch(err=>{
        console.log(err.message);
    })
    client.release();
});

app.listen(CONST.PORT,()=>{console.log("listening on port " + CONST.PORT)});
