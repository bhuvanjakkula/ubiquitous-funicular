import type {ParsedInvoice,ParsedTxn} from "../parsers";
import type {AmountClass} from "./score";
export type Bucket="matched"|"short_payment"|"fx_gap";
export type MatchFlag="SHORT"|"FEE"|"OVER"|"FX_GAP";
export function bucketFor(invoice:ParsedInvoice,txn:ParsedTxn,amountClass:AmountClass):Bucket{if(invoice.currency!==txn.currency)return"fx_gap";if(amountClass==="SHORT"||amountClass==="SHORT_OPEN")return"short_payment";return"matched";}
export function flagsFor(invoice:ParsedInvoice,txn:ParsedTxn,amountClass:AmountClass,flatMinor:bigint):MatchFlag[]{const flags:MatchFlag[]=[];if(invoice.currency!==txn.currency)flags.push("FX_GAP");if(amountClass==="SHORT"||amountClass==="SHORT_OPEN")flags.push("SHORT");if((amountClass==="SHORT"&&invoice.amountMinor-txn.amountMinor<=flatMinor)||/\b(?:WIRE\s+)?FEE\b/i.test(txn.description))flags.push("FEE");if(amountClass==="OVER")flags.push("OVER");return flags;}
