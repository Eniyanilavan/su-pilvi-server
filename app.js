const express = require('express');
const bodyParser = require('body-parser');
const {CONST} = require('./conts/conts');


const app = express();

app.use((req,res,next)=>{
    var body = '';
    if(req.method === 'GET'){
        next();
    }
    else{
        if(req.headers["content-type"] === 'application/json'){
            req.on('data',(data)=>{ body += data});
            req.on('end',()=>{
                try{
                    body = JSON.parse(body);
                }
                catch(e){
                    body = {};
                }
                req.body = body;
                next();
            });
        }
        else if(req.headers["content-type"].indexOf('text/') !== -1){
            req.on('data',(data)=>{ body += data});
            req.on('end',()=>{
                req.body = body;
                next();
            });
        }
    }
});

app.get('/',(req,res)=>{
    res.status(200).send();
});

app.post('/',(req,res)=>{
    console.log(req.body);
    res.status(200).send();
});

app.listen(CONST.PORT,()=>{console.log("listening on port " + CONST.PORT)});
