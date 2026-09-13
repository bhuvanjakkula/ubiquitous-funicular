"""Canonical names take precedence, then aliases in sorted order."""
def norm_header(h: str) -> str:
    return " ".join(h.strip().lower().split())

BANK_ALIASES = {
 "posted_date": {"posted date","date","transaction date","post date","posted","trans date"},
 "amount": {"amount","amt","transaction amount"},
 "debit": {"debit","withdrawal","withdrawals","money out"},
 "credit": {"credit","deposit","deposits","money in"},
 "description": {"description","memo","name","payee","narrative","details"},
 "bank_line_id": {"fitid","transaction id","id","reference","ref","txn id","bank line id"},
 "value_date": {"value date","effective date"},
 "account_ref": {"account","account number","account ref","account #","last4"},
 "currency": {"currency","ccy","curr"},
 "type": {"type","txn type","transaction type"},
 "check_number": {"check number","cheque number","check #","chk"},
}
GL_ALIASES = {
 "line_id": {"line id","split id","line","line no","line number"},
 "journal_id": {"journal no","journal id","entry no","entry number","transaction number","doc number","doc no","journal"},
 "txn_date": {"date","transaction date","accounting date","txn date","entry date"},
 "account_id": {"account","account no","account number","gl code","acct","account id"},
 "account_name": {"account name","acct name","gl name"},
 "debit": {"debit","debit amount","dr"},
 "credit": {"credit","credit amount","cr"},
 "created_at": {"created at","created","created date","entered at","entered"},
 "modified_at": {"modified at","modified","last modified","updated at","updated"},
 "created_by": {"created by","entered by","user"},
 "modified_by": {"modified by","updated by"},
 "memo": {"memo","description","narration","line memo"},
 "source": {"source","origin"},
 "cleared_flag": {"cleared","cleared flag","reconciled","r"},
 "cleared_date": {"cleared date","reconciled date"},
 "recon_id": {"recon id","reconciliation id","statement id"},
 "is_void": {"void","is void","voided"},
 "reverses_journal_id": {"reverses","reverses journal","reversed journal"},
 "currency": {"currency","ccy"},
}

def resolve_headers(headers, aliases):
    found = {}
    for original in headers:
        found.setdefault(norm_header(original), original)
    mapping = {}
    for logical, names in aliases.items():
        for candidate in [logical, *sorted(names)]:
            if norm_header(candidate) in found:
                mapping[logical] = found[norm_header(candidate)]
                break
    return mapping


QBO_BANK_ALIASES = {
 "posted_date": {"date", "transaction date", "posted on"}, "amount": {"original amount"},
 "description": {"memo", "payee", "name", "bank detail"},
 "bank_line_id": {"fitid", "ref no.", "ref no", "num", "transaction id"},
 "type": {"type", "transaction type"}, "debit": {"spend", "payment", "money out", "withdrawal"},
 "credit": {"receive", "deposit", "money in"},
}
QBO_GL_ALIASES = {
 "journal_id": {"trans #", "transaction #", "num", "journal no.", "doc no."},
 "txn_date": {"date", "transaction date"}, "account_id": {"account", "account #", "account no."},
 "account_name": {"account name"}, "debit": {"debit", "debit amount"}, "credit": {"credit", "credit amount"},
 "memo": {"memo", "description", "name", "payee"}, "created_at": {"created", "entered"},
 "modified_at": {"last modified", "modified"}, "cleared_flag": {"clr", "reconciled", "✓", "r"},
 "line_id": {"line", "split id"},
}
XERO_BANK_ALIASES = {
 "posted_date": {"date", "bank transaction date"}, "amount": {"amount"},
 "description": {"payee", "particulars", "description", "reference", "code"},
 "bank_line_id": {"banktransactionid", "reference", "id"},
 "debit": {"spent", "debit"}, "credit": {"received", "credit"},
}
XERO_GL_ALIASES = {
 "journal_id": {"journalnumber", "journal number", "narration"}, "txn_date": {"journaldate", "date"},
 "account_id": {"accountcode", "account code"}, "account_name": {"accountname", "account name"},
 "debit": {"debit"}, "credit": {"credit"}, "memo": {"narration", "description", "trackingname1"},
 "line_id": {"journallineid"},
}


def aliases_for(dialect):
    from .errors import IngestError
    if dialect not in ("generic", "qbo", "xero"):
        raise IngestError("unknown export_dialect: " + str(dialect))
    bank, gl = ({k: set(v) for k, v in base.items()} for base in (BANK_ALIASES, GL_ALIASES))
    if dialect != "generic":
        extras = (QBO_BANK_ALIASES, QBO_GL_ALIASES) if dialect == "qbo" else (XERO_BANK_ALIASES, XERO_GL_ALIASES)
        for target, extra in zip((bank, gl), extras):
            for field, names in extra.items(): target[field].update(names)
    return bank, gl
