import { rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const dist=resolve(root,'dist');
if(!dist.startsWith(`${root}${sep}`))throw new Error(`Refusing to clean a path outside the project: ${dist}`);
await rm(dist,{recursive:true,force:true});
