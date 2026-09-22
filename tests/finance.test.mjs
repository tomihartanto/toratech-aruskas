import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
import {hashPassword,tokenHash} from '../src/lib/security.ts';
import {saveTransaction,saveCategoryRecord,saveBudgetRecord,deleteRecord} from '../src/lib/finance.ts';
import {issueInvite,acceptInvite,issueReset,resetPassword,authenticate,newSession,sessionUser} from '../src/lib/accounts.ts';
const url=new URL(process.env.DATABASE_URL); assert.equal(url.pathname,'/db_aruskas');assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const f=o=>{const data=new FormData();for(const [k,v]of Object.entries(o)) data.set(k,String(v));return data;};
test('ownership, CRUD, reset, throttling, expiration and concurrent single use',async()=>{
 const prefix=randomBytes(8).toString('hex'),password=randomBytes(24).toString('base64url'); const users=[],emails=[];
 try {
  for(let i=0;i<2;i++){const email=`${prefix}-${i}`;emails.push(email); users.push(await db.user.create({data:{username:email,name:'Test',passwordHash:await hashPassword(password)}}));}
  const [a,b]=users;
  await saveCategoryRecord(db,a.id,f({name:'Private',type:'expense'}));const cat=await db.category.findFirstOrThrow({where:{userId:a.id}});
  await assert.rejects(saveCategoryRecord(db,b.id,f({id:cat.id,name:'Stolen',type:'income'})));
  const input={type:'expense',categoryId:cat.id,amount:'1.01',date:'2026-01-01',note:'private'};
  await assert.rejects(saveTransaction(db,b.id,f(input))); await saveTransaction(db,a.id,f(input));
  const tx=await db.transaction.findFirstOrThrow({where:{userId:a.id}});assert.equal(tx.date.toISOString(),'2026-01-01T00:00:00.000Z');
  await assert.rejects(saveTransaction(db,b.id,f({...input,id:tx.id}))); await assert.rejects(deleteRecord(db,b.id,'transaction',tx.id));
  await assert.rejects(saveBudgetRecord(db,b.id,f({categoryId:cat.id,month:'2026-01',limitAmount:'100'})));
  await saveBudgetRecord(db,a.id,f({categoryId:cat.id,month:'2026-01',limitAmount:'100'}));const budget=await db.budget.findFirstOrThrow({where:{userId:a.id}});
  await assert.rejects(deleteRecord(db,b.id,'budget',budget.id));await assert.rejects(deleteRecord(db,b.id,'category',cat.id));await assert.rejects(deleteRecord(db,a.id,'category',cat.id));
  await assert.rejects(saveCategoryRecord(db,a.id,f({id:cat.id,name:'Private',type:'income'})));
  await deleteRecord(db,a.id,'budget',budget.id);await deleteRecord(db,a.id,'transaction',tx.id);await deleteRecord(db,a.id,'category',cat.id);
  const session=await newSession(db,a.id),reset=await issueReset(db,a.id),next=randomBytes(24).toString('base64url');
  await resetPassword(db,reset,next);await assert.rejects(resetPassword(db,reset,next));assert.equal(await sessionUser(db,session),null);await authenticate(db,a.username,next);
  for(let i=0;i<5;i++) await assert.rejects(authenticate(db,b.username,'wrong'));
  await assert.rejects(authenticate(db,b.username,password),/15 menit/);
  const address=`${prefix}-invite`;emails.push(address);const token=await issueInvite(db,address);
  const results=await Promise.allSettled([acceptInvite(db,token,'Test',password),acceptInvite(db,token,'Test',password)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  const created=await db.user.findUnique({where:{username:address}});if(created)users.push(created);
  const expiredAddress=`${prefix}-expired`;emails.push(expiredAddress);const expired=await issueInvite(db,expiredAddress);await db.invite.update({where:{tokenHash:tokenHash(expired)},data:{expiresAt:new Date(0)}});await assert.rejects(acceptInvite(db,expired,'Test',password));
 } finally {for(const u of users)await db.user.delete({where:{id:u.id}});for(const email of emails){await db.invite.deleteMany({where:{username:email}});await db.loginAttempt.deleteMany({where:{key:tokenHash(email)}});}await db.$disconnect();}
});
