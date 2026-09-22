import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword, tokenHash } from '../src/lib/security.ts';
import { newSession, issueInvite } from '../src/lib/accounts.ts';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'D:/code/personal/toratech-docs/node_modules/playwright');
const base=process.env.APP_URL;
assert.equal(new URL(base).hostname,'127.0.0.1');
const dbUrl=new URL(process.env.DATABASE_URL); assert.equal(dbUrl.pathname,'/db_aruskas'); assert.ok(['localhost','127.0.0.1'].includes(dbUrl.hostname));
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const prefix=`e2e-${randomBytes(8).toString('hex')}`;
const password=randomBytes(24).toString('base64url');
const ids=[],emails=[],errors=[];
let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
 let response=await page.goto(`${base}/setup`); assert.ok([200,307].includes(response.status()));
 if(page.url().endsWith('/setup')) {assert.match(await page.textContent('body'),/tomihartanto/); assert.equal(await page.locator('input[type=password]').count(),2);}
 const email=`${prefix}`; emails.push(email);
 const token=await issueInvite(db,email);
 await page.goto(`${base}/register?token=${token}`);
 await page.getByLabel('Nama',{exact:true}).fill('Regression User');
 await page.getByLabel('Password baru',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Buat akun',exact:true}).click();
 await page.waitForURL(base+'/');
 const user=await db.user.findUniqueOrThrow({where:{username:email}}); ids.push(user.id); assert.equal(user.role,'user');
 assert.equal(await db.session.count({where:{userId:user.id}}),1);
 await page.goto(base+'/transaksi/baru');
 await page.getByLabel('Jumlah (Rp)',{exact:true}).fill('12345.67');
 await page.getByLabel('Tanggal',{exact:true}).fill('2024-02-29');
 await page.getByLabel('Catatan (opsional)',{exact:true}).fill(prefix);
 await page.getByRole('button',{name:'Simpan',exact:true}).click(); await page.waitForURL(base+'/transaksi');
 assert.match(await page.textContent('main'),new RegExp(prefix));
 const tx=await db.transaction.findFirstOrThrow({where:{userId:user.id,note:prefix}}); assert.equal(tx.date.toISOString(),'2024-02-29T00:00:00.000Z');
 await page.goto(`${base}/transaksi/${tx.id}`); await page.getByLabel('Jumlah (Rp)',{exact:true}).fill('999'); await page.getByRole('button',{name:'Simpan',exact:true}).click(); await page.waitForURL(base+'/transaksi');
 assert.equal(String((await db.transaction.findUniqueOrThrow({where:{id:tx.id}})).amount),'999');
 await page.goto(base+'/pengaturan');
 const form=page.locator('form').filter({has:page.getByRole('button',{name:'Tambah kategori',exact:true})});
 await form.getByLabel('Nama kategori',{exact:true}).fill(prefix); await form.getByRole('button',{name:'Tambah kategori',exact:true}).click();
 await page.getByRole('heading',{name:prefix,exact:true}).waitFor();
 const card=page.locator('article').filter({has:page.getByRole('heading',{name:prefix,exact:true})});
 await card.getByText('Edit kategori',{exact:true}).click(); await card.getByLabel('Nama kategori',{exact:true}).fill(prefix+' edited'); await card.getByRole('button',{name:'Simpan kategori',exact:true}).click(); await page.getByRole('heading',{name:prefix+' edited',exact:true}).waitFor();
 await page.getByLabel('Kategori budget',{exact:true}).selectOption({label:prefix+' edited'}); await page.getByLabel('Batas pengeluaran (Rp)',{exact:true}).fill('10000'); await page.getByRole('button',{name:'Simpan budget',exact:true}).click(); await page.getByRole('button',{name:'Hapus budget',exact:true}).waitFor();
 for(const route of ['/','/transaksi','/pengaturan','/akun']) {
  await page.setViewportSize({width:390,height:844}); await page.goto(base+route);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow ${route}`);
  assert.ok(await page.getByRole('button',{name:'Keluar',exact:true}).last().isVisible());
 }
 await page.goto(base+'/transaksi'); page.once('dialog',d=>d.accept()); await page.getByRole('button',{name:'Hapus',exact:true}).click();
 await page.getByText('Mulai catat arus kas Anda',{exact:true}).waitFor(); assert.equal(await db.transaction.count({where:{id:tx.id}}),0);
 await page.getByRole('button',{name:'Keluar',exact:true}).last().click(); await page.waitForURL(base+'/login'); assert.equal(await db.session.count({where:{userId:user.id}}),0);
 await page.getByLabel('Username',{exact:true}).fill(email); await page.getByLabel('Password',{exact:true}).fill(password); await page.getByRole('button',{name:'Masuk',exact:true}).click(); await page.waitForURL(base+'/');
 const adminEmail=`${prefix}-admin`; emails.push(adminEmail);
 const admin=await db.user.create({data:{username:adminEmail,name:'Regression Admin',passwordHash:await hashPassword(password),role:'admin'}}); ids.push(admin.id);
 const adminContext=await browser.newContext(); const session=await newSession(db,admin.id); await adminContext.addCookies([{name:'aruskas_session',value:session,url:base,httpOnly:true,sameSite:'Lax'}]);
 const adminPage=await adminContext.newPage(); await adminPage.goto(base+'/admin'); assert.match(await adminPage.textContent('main'),/Kelola akun/);
 const invited=`${prefix}-invited`; emails.push(invited); await adminPage.getByLabel('Username pengguna',{exact:true}).fill(invited); await adminPage.getByRole('button',{name:'Buat undangan',exact:true}).click(); await adminPage.getByLabel('Tautan pribadi',{exact:true}).waitFor();
 const privateLink=await adminPage.getByLabel('Tautan pribadi',{exact:true}).inputValue(); assert.ok(privateLink.startsWith(base+'/register?token='));
 assert.equal(await db.invite.count({where:{username:invited,tokenHash:tokenHash(new URL(privateLink).searchParams.get('token'))}}),1);
 await adminPage.goto(base+'/setup'); assert.ok(adminPage.url().endsWith('/login')||adminPage.url()===base+'/');
 assert.deepEqual(errors,[]);
 console.log('PASS production browser: setup UI, invite registration, login/logout, session DB revocation, transaction create/edit/delete, date UTC, category create/edit, budget create, mobile 390px no overflow, admin invite, bootstrap closed, no console/page errors.');
} finally {
 if(browser) await browser.close();
 // Cleanup ONLY exact randomly named test users/invites. Never blanket deletes.
 for(const email of emails) {const user=await db.user.findUnique({where:{username:email}}); if(user) await db.user.delete({where:{id:user.id}}); await db.invite.deleteMany({where:{username:email}}); await db.loginAttempt.deleteMany({where:{key:tokenHash(email)}});}
 await db.$disconnect();
}
