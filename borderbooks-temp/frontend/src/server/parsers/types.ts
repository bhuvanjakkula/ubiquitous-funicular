import type {TxnSource} from "@prisma/client";
export type ParseError={rowNumber:number;message:string};
export type ParseResult<T>={rows:T[];errors:ParseError[]};
export type RawRow=Record<string,string>;
export type ParsedInvoice={invoiceNumber:string;customerName:string;currency:string;amountMinor:bigint;issueDate:string;dueDate:string;reference?:string;rawJson:RawRow;fingerprint:string};
export type ParsedTxn={source:TxnSource;vendorId?:string;postedAt:string;valueDate?:string;currency:string;amountMinor:bigint;description:string;counterparty?:string;reference?:string;endToEndId?:string;rawJson:RawRow;fingerprint:string};
