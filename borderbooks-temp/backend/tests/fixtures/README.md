# Locked Task 2 fixtures

These files are immutable inputs for parser and matching work in later tasks. Amounts in the CSV files are major-unit text; persisted and computed amounts use integer minor units.

| Transaction | Minor amount | Locked outcome |
|---|---:|---|
| TXN-01 | EUR 1000000 | Hard-link INV-1001 as `matched`; wins over duplicate TXN-14. |
| TXN-02 | GBP 248500 | Hard-link INV-1002 as `short_payment` with `SHORT`, `FEE`. |
| TXN-03 | USD 475200 | Hard-link INV-1003 as `short_payment` with `SHORT`; strong-ID `SHORT_OPEN`. |
| TXN-04 | EUR 90000 | Hard-link INV-1004 as `matched` using fuzzy/dash-normalized reference. |
| TXN-05 | EUR 1000000 | `AMOUNT_DATE` suggestion for INV-1005 only; remains `unallocated_in`. |
| TXN-06 | JPY 330000 | Hard-link INV-1006 as `matched` using normalized `NJ-77`/`NJ77`. |
| TXN-07 | USD 150000 | `AMOUNT_DATE` suggestion for INV-1007 only; remains `unallocated_in`. |
| TXN-08 | USD 59800 | Never hard-link; pre-assignment batch candidate is dropped after INV-1008 links; remains `unallocated_in`. |
| TXN-09 | USD 29900 | Hard-link INV-1008 as `matched`; INV-1009 remains unmatched. |
| TXN-10 | EUR 1228000 | Hard-link INV-1010 as `matched` with `OVER`; INV-1011 remains unmatched. |
| TXN-11 | USD -2500 | Never link; `unallocated_out`. |
| TXN-12 | USD 20000 | No candidate; `unallocated_in`. |
| TXN-13 | EUR -5000 | Never link; `unallocated_out`. |
| TXN-14 | EUR 1000000 | Duplicate money/reference but distinct vendor ID; no link after TXN-01 wins; `unallocated_in`. |
| TXN-15 | USD 77700 | Outside default window and `unallocated_in`; links INV-1012 when `dateWindowDaysAfter=120`. |

Default unmatched invoices are INV-1005, INV-1007, INV-1009, INV-1011, and INV-1012.
