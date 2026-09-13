import {createRequire} from 'node:module';
import path from 'node:path';
export default {server:{host:'127.0.0.1',port:5173,strictPort:true},optimizeDeps:{esbuildOptions:{tsconfigRaw:{compilerOptions:{}},plugins:[{name:'local-dependency-resolution',setup(build){build.onResolve({filter:/.*/},args=>{if(!args.importer)return;try{return {path:createRequire(args.importer).resolve(args.path)}}catch{return undefined}})}}]}}};
