import 'dotenv/config'; import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});await c.connect();
const r=await c.query(process.argv[2]);console.log(JSON.stringify(r.rows,null,1));await c.end();
