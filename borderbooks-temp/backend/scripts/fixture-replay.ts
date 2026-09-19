import {readFileSync} from "node:fs";
import {join} from "node:path";
import {isDeepStrictEqual} from "node:util";
import {parseBankOrPayout,parseInvoices} from "../src/server/parsers";
import {runMatch} from "../src/server/matching/engine";

const root=process.cwd(),fixture=(name:string)=>readFileSync(join(root,"tests","fixtures",name)),golden=JSON.parse(fixture("expected_match.json").toString("utf8"));
const invoices=parseInvoices(fixture("invoices.csv"),"invoices.csv"),txns=parseBankOrPayout(fixture("payouts.csv"),"payouts.csv");
const failures:string[]=[];
if(invoices.errors.length)failures.push(`Invoice parse errors: ${JSON.stringify(invoices.errors)}`);
if(txns.errors.length)failures.push(`Transaction parse errors: ${JSON.stringify(txns.errors)}`);
const result=runMatch(invoices.rows,txns.rows,golden.settings);
if(result.links.length!==golden.links.length)failures.push(`links.length: expected ${golden.links.length}, received ${result.links.length}`);
for(const expected of golden.links){const actual=result.links.find(link=>link.invoiceNumber===expected.invoiceNumber&&link.txnId===expected.txnId);if(!actual){failures.push(`Missing link ${expected.invoiceNumber} + ${expected.txnId}`);continue;}const fields=["invoiceNumber","txnId","bucket","method","flags","expectedMinor","receivedMinor","feeMinor","fxDiffMinor"] as const;for(const field of fields)if(!isDeepStrictEqual(actual[field],expected[field]))failures.push(`${expected.invoiceNumber}.${field}: expected ${JSON.stringify(expected[field])}, received ${JSON.stringify(actual[field])}`);if(actual.confidence<expected.minConfidence)failures.push(`${expected.invoiceNumber}.confidence: expected at least ${expected.minConfidence}, received ${actual.confidence}`);}
const comparisons=[{name:"unmatchedInvoices",actual:result.unmatchedInvoices.map(row=>row.invoiceNumber),expected:golden.unmatchedInvoices},{name:"unallocated_in",actual:result.unallocated_in.map(row=>row.vendorId),expected:golden.unallocated_in},{name:"unallocated_out",actual:result.unallocated_out.map(row=>row.vendorId),expected:golden.unallocated_out},{name:"suggestions",actual:result.suggestions.map(item=>({type:item.type,...item.invoiceNumber?{invoiceNumber:item.invoiceNumber}:{},txnId:item.txnId,...item.invoiceNumbers?{invoiceNumbers:item.invoiceNumbers}:{},reason:item.reason})),expected:golden.suggestions}];
for(const comparison of comparisons)if(!isDeepStrictEqual(comparison.actual,comparison.expected))failures.push(`${comparison.name} mismatch\nexpected: ${JSON.stringify(comparison.expected,null,2)}\nreceived: ${JSON.stringify(comparison.actual,null,2)}`);
if(failures.length){console.error(`Fixture replay failed with ${failures.length} mismatch${failures.length===1?"":"es"}:\n\n${failures.join("\n\n")}`);process.exitCode=1;}else console.log(`Fixture replay passed: ${invoices.rows.length} invoices, ${txns.rows.length} transactions, ${result.links.length} links.`);
