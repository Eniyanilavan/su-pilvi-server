const express = require('express');
const bodyParser = require('body-parser');
const {Pool} = require('pg');
const {CONST} = require('./conts/conts');
const multipart = require('multiparty');
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

const create_tables = async (email,body)=>{
    const pool1 = new Pool({
        user : "postgres",
        password : "Eniyan007!",
        host : "localhost",
        port : "5432",
        database : email
    })
    var client1 = await pool1.connect();
    body.log_array.map(async name=>{
        var table_name = name.replace(/[\-\.@\^]/g,"_");
        await client1.query(`CREATE TABLE ${table_name}(category varchar, event_code integer, event_type integer, log_file varchar, message varchar, record_number integer, type varchar, source_name varchar, date date)`)
        .then(rows=>{
            console.log(rows);
        })
        .catch(err=>{
            console.log(err);
        })
    })
    client1.release();
}

const app = express();

const form_data = (req,res,next)=>{
    let form = new multipart.Form();
    form.on('part',(part)=>{
        part.on('data',data=>{
            req.formData = new Buffer(data).toString();
            next();
        })
        .on('close',()=>{
            next();
        })
    })
    form.parse(req);
}

app.use(bodyParser.json({limit:"500mb"}));

app.use((req,res,next)=>{
    res.setHeader("Access-Control-Allow-Origin","*");
    res.setHeader("Access-Control-Allow-Methods","GET,POST,DELETE");
    res.setHeader("Access-Control-Allow-Headers","Content-Type");
    next();
})

app.get('/eventloger/:file',(req,res)=>{
    console.log("hi");
    var path = __dirname + "/download/eventloger/"+req.params.file;
    res.download(path);
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

app.post("/deploy", async (req,res)=>{
    console.log("request recieved");
    var body = (req.body);
    console.log(body);
    if(body.log){
       var email = (body.email.replace(/[\.@\^]/g,"_"));
        var client = await pool.connect();
        await client.query(`CREATE DATABASE ${email}`)
        .then(async db_rows=>{
            create_tables(email,body);
        })
        .catch(err=>{
            if(err.message.includes(`database "${email}" already exists`)){
                create_tables(email,body);
            }
            else{
                console.log(err)
            }
        })
        client.release();
    }
    var params = {
        StackName: body.title, /* required */
        Capabilities: [
            "CAPABILITY_IAM",
            "CAPABILITY_NAMED_IAM" 
          ],
        OnFailure: "DELETE",
        TemplateBody: body.yaml,
    };
    cloudformation.createStack(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            res.sendStatus(404);
        }
        else {
            console.log(data);           // successful response
            res.sendStatus(200);
        }    
    });
});

app.post('/bot',async (req,res)=>{
    var body = (req.body);
    console.log(body);
    res.sendStatus(200);
})

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

app.delete('/delete',async (req,res)=>{
    var client = await pool.connect();
    client.query(`DELETE FROM templates WHERE name=$1`,[req.body.name])
    .then(rows=>{
        res.sendStatus(200);
    })
    .catch(err=>{
        console.log(err);
        res.sendStatus(500);
    })
    client.release();
})

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
