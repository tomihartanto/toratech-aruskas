import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from '../src/lib/security.ts';
import { username, text } from '../src/lib/validation.ts';
const url = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/db_aruskas' || (url.port && url.port !== '5432')) throw new Error('Bootstrap hanya localhost:5432/db_aruskas.');
if (!process.stdin.isTTY) throw new Error('Jalankan npm run bootstrap langsung pada terminal lokal interaktif.');
const db = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
let muted=false;
const output = new Writable({write(chunk,encoding,callback){if(!muted) process.stdout.write(chunk,encoding);callback();}});
const rl=createInterface({input:process.stdin,output,terminal:true});
try {
 if(await db.user.count({where:{role:'admin'}})) throw new Error('Admin sudah ada. Bootstrap dinonaktifkan.');
 const address=username(await rl.question('Username admin: '));
 const name=text(await rl.question('Nama admin: '),'Nama',80);
 process.stdout.write('Password baru (12–128 karakter, disembunyikan): '); muted=true;
 const password=await rl.question(''); muted=false; process.stdout.write('\n');
 process.stdout.write('Ulangi password (disembunyikan): '); muted=true;
 const confirmation=await rl.question(''); muted=false; process.stdout.write('\n');
 if(password!==confirmation) throw new Error('Konfirmasi password tidak cocok.');
 const passwordHash=await hashPassword(password);
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(73184219)`;
  if(await tx.user.count({where:{role:'admin'}})) throw new Error('Admin sudah ada.');
  const user=await tx.user.create({data:{username:address,name,passwordHash,role:'admin',active:true}});
  const templates=await tx.category.findMany({where:{userId:null},select:{name:true,type:true}});
  await tx.category.createMany({data:templates.map(c=>({...c,userId:user.id,icon:'tag'}))});
 });
 console.log('Admin dibuat. Masuk melalui /login memakai username dan password yang baru Anda isi.');
} catch(e) { console.error(e.message); process.exitCode=1; } finally { rl.close(); await db.$disconnect(); }
