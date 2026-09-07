class IngestError(ValueError):
    """Collected input errors; row 0 denotes CSV headers, data rows start at 1."""
    def __init__(self, errors):
        if isinstance(errors, str):
            errors = [{"message": errors}]
        self.errors = errors
        super().__init__("; ".join(
            f"{e.get('file', 'ingest')} row {e.get('row', '?')}: {e['message']}"
            for e in errors
        ))
