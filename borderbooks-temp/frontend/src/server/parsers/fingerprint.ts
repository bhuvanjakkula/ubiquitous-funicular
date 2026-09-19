import {createHash} from "node:crypto";
export const sha256=(value:string)=>createHash("sha256").update(value).digest("hex");
export const normalizeDescription=(value:string)=>value.normalize("NFKD").toUpperCase().replace(/[^A-Z0-9]+/g," ").trim().replace(/\s+/g," ");
