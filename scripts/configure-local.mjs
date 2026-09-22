import { readFile, writeFile } from 'node:fs/promises';
const path = new URL('../.env',import.meta.url);
let text=await readFile(path,'utf8');
for(const [key,value] of Object.entries({APP_URL:'http://127.0.0.1:3000',LOCAL_BOOTSTRAP_USERNAME:'tomihartanto'})) {
 const pattern=new RegExp(`^${key}=.*$`,'m');
 text=pattern.test(text)?text.replace(pattern,`${key}=${value}`):`${text.trimEnd()}\n${key}=${value}\n`;
}
await writeFile(path,text,{mode:0o600});
console.log('Local APP_URL and initial admin username configured. Secrets not printed.');
