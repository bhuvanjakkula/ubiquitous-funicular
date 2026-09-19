import {readCsv,findHeader,value} from "./csv";
import {sha256} from "./fingerprint";
import {parseMinor} from "./money";
import type {ParsedInvoice,ParseResult} from "./types";
const NUMBER=["invoice_number","invoice number","invoice","number"];
const CUSTOMER=["customer","customer_name","customer name","name"];
const CURRENCY=["currency","ccy"];
const AMOUNT=["amount","total","invoice_amount","gross_amount"];
const ISSUE_DATE=["issue_date","issue date","invoice_date","invoice date","date"];
const DUE_DATE=["due_date","due date","due"];
const REFERENCE=["reference","ref","invoice_reference","po_number"];
export function parseInvoices(file:Buffer,filename:string):ParseResult<ParsedInvoice>{const csv=readCsv(file,filename);if(csv.errors.some(error=>error.rowNumber<=1))return{rows:[],errors:csv.errors};if(csv.rows.length&&findHeader(csv.rows[0],NUMBER)===undefined)return{rows:[],errors:[...csv.errors,{rowNumber:1,message:"Invoice mode requires an invoice-number alias column"}]};const rows:ParsedInvoice[]=[],errors=[...csv.errors];csv.rows.forEach((raw,index)=>{try{const invoiceNumber=value(raw,NUMBER).toUpperCase(),customerName=value(raw,CUSTOMER),currency=value(raw,CURRENCY).toUpperCase(),amount=value(raw,AMOUNT),issueDate=value(raw,ISSUE_DATE),dueDate=value(raw,DUE_DATE),reference=value(raw,REFERENCE)||undefined;if(!invoiceNumber||!customerName||!currency||!amount||!issueDate||!dueDate)throw new Error("Missing required invoice field");const amountMinor=parseMinor(amount,currency),fingerprint=sha256([invoiceNumber,issueDate,currency,amountMinor.toString(),reference??""].join("|"));rows.push({invoiceNumber,customerName,currency,amountMinor,issueDate,dueDate,reference,rawJson:raw,fingerprint});}catch(error){errors.push({rowNumber:index+2,message:error instanceof Error?error.message:"Invalid invoice row"});}});return{rows,errors};}
