import {SECURITY_HEADERS} from '../multiplayer/security.mjs';
import {build} from 'esbuild';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
await mkdir('standalone',{recursive:true});
await writeFile('standalone-entry.tsx',`import React from 'react';import{createRoot}from'react-dom/client';import Game from './app/page';createRoot(document.getElementById('root')!).render(<Game/>);`);
await build({entryPoints:['standalone-entry.tsx'],outfile:'standalone/game.js',bundle:true,minify:true,format:'esm',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
let {readFile}=await import('node:fs/promises');await writeFile('standalone/game.css',(await readFile('app/globals.css','utf8')).replace('@import "tailwindcss";',''));
await copyFile('public/favicon.svg','standalone/favicon.svg');
await writeFile('standalone/index.html','<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#14333f"><title>ALPINE RUSH｜雪線競速</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/game.css"></head><body><div id="root"></div><script type="module" src="/game.js"></script></body></html>');
console.log('Standalone Cloudflare game built.');

await writeFile('standalone/_headers','/*\n'+Object.entries(SECURITY_HEADERS).map(([k,v])=>'  '+k+': '+v).join('\n')+'\n');
