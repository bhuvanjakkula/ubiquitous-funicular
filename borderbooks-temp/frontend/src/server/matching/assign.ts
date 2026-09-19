import type {AmountClass,MatchSettings} from "./score";
export type AssignmentCandidate={invoiceNumber:string;txnId:string;score:number;strongId:boolean;sameCurrency:boolean;insideWindow:boolean;amountClass:AmountClass};
export function isEligible(candidate:AssignmentCandidate){return candidate.score>=40;}
export function isAutoLink(candidate:AssignmentCandidate,settings:MatchSettings={}){if(candidate.amountClass==="WILD")return false;const pathA=candidate.strongId&&candidate.insideWindow&&(["EQUAL","SHORT","SHORT_OPEN","OVER"] as AmountClass[]).includes(candidate.amountClass),pathB=candidate.score>=(settings.minAutoConfidence??70)&&candidate.sameCurrency&&candidate.insideWindow&&(candidate.amountClass==="EQUAL"||candidate.amountClass==="SHORT");return pathA||pathB;}
export function assignmentOrder(a:AssignmentCandidate,b:AssignmentCandidate){return Number(b.strongId)-Number(a.strongId)||b.score-a.score||a.invoiceNumber.localeCompare(b.invoiceNumber)||a.txnId.localeCompare(b.txnId);}
