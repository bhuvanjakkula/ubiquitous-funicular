import type {TxnSource} from "@prisma/client";
import {findHeader,headerKey,readCsv,value} from "./csv";
import {normalizeDescription,sha256} from "./fingerprint";
import {parseMinor} from "./money";
import type {ParsedTxn,ParseResult,RawRow} from "./types";
const ID=["id","transaction_id","transaction id","txn_id","payout_id","vendor_id"];
const POSTED_AT=["posted_at","posted at","posted_date","posted date","transaction_date","date"];
const VALUE_DATE=["value_date","value date","settled_at","settlement_date"];
const CURRENCY=["currency","ccy","target_currency","source_currency"];
const AMOUNT=["amount","value","target_amount","Target amount","source_amount","Source amount"];
const DESCRIPTION=["description","memo","narrative","details","note"];
const REFERENCE=["reference","ref","payment_reference"];
const SOURCE=["source","provider"];
const COUNTERPARTY=["counterparty","counterparty_name","merchant","recipient","sender"];
const END_TO_END=["end_to_end_id","endToEndId","end-to-end id"];
const SOURCES=new Set<TxnSource>(["BANK","STRIPE","WISE","PAYONEER","GENERIC"]);
function detectedSource(raw:RawRow):TxnSource{const headers=new Set(Object.keys(raw).map(headerKey));if(headers.has("type")&&headers.has("fee")&&headers.has("id"))return"STRIPE";if(headers.has("target_amount")||headers.has("source_amount"))return"WISE";return"GENERIC";}
export function parseBankOrPayout(file:Buffer,filename:string,hint?:TxnSource):ParseResult<ParsedTxn>{const csv=readCsv(file,filename);if(csv.errors.some(error=>error.rowNumber<=1))return{rows:[],errors:csv.errors};const rows:ParsedTxn[]=[],errors=[...csv.errors];csv.rows.forEach((raw,index)=>{try{const amountText=value(raw,AMOUNT),currencyHeader=value(raw,CURRENCY).toUpperCase(),currency=currencyHeader||(amountText.toUpperCase().match(/\b[A-Z]{3}\b/)?.[0]??""),postedAt=value(raw,POSTED_AT),valueDate=value(raw,VALUE_DATE)||undefined,description=value(raw,DESCRIPTION),vendorId=value(raw,ID)||undefined,reference=value(raw,REFERENCE)||undefined,counterparty=value(raw,COUNTERPARTY)||undefined,endToEndId=value(raw,END_TO_END)||undefined,rowSource=value(raw,SOURCE).toUpperCase() as TxnSource,source=hint??(SOURCES.has(rowSource)?rowSource:detectedSource(raw));if(!currency||!amountText||!postedAt)throw new Error("Missing required transaction field");const amountMinor=parseMinor(amountText,currency),fingerprint=sha256([source,vendorId??"",currency,postedAt,amountMinor.toString(),normalizeDescription(description),reference??""].join("|"));rows.push({source,vendorId,postedAt,valueDate,currency,amountMinor,description,counterparty,reference,endToEndId,rawJson:raw,fingerprint});}catch(error){errors.push({rowNumber:index+2,message:error instanceof Error?error.message:"Invalid transaction row"});}});return{rows,errors};}
