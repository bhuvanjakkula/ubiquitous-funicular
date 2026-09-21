document.getElementById('decide-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        equity: parseFloat(document.getElementById('equity').value),
        entry: parseFloat(document.getElementById('entry').value),
        invalidation: parseFloat(document.getElementById('invalidation').value),
        adv: parseFloat(document.getElementById('adv').value),
        spread: parseFloat(document.getElementById('spread').value),
        stock_rs: parseFloat(document.getElementById('stock_rs').value),
        group_rs: parseFloat(document.getElementById('group_rs').value),
        regime: document.getElementById('regime').value
    };
    
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="results-empty">Analyzing risk parameters...</div>';
    
    try {
        const response = await fetch('/api/decide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        let html = `<div class="result-card">`;
        
        if (data.accepted) {
            html += `<div class="status-badge status-accept">TRADE ACCEPTED</div>`;
        } else {
            html += `<div class="status-badge status-reject">STAND ASIDE</div>`;
        }
        
        html += `
            <div class="metric-grid">
                <div class="metric">
                    <div class="metric-label">Approved Shares</div>
                    <div class="metric-value">${data.shares}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Planned Loss</div>
                    <div class="metric-value">$${data.planned_loss.toFixed(2)}</div>
                </div>
                <div class="metric" style="grid-column: span 2">
                    <div class="metric-label">Market Alignment</div>
                    <div class="metric-value" style="text-transform: capitalize; font-size: 1.2rem;">${data.alignment.replace('_', ' ')}</div>
                </div>
            </div>
        `;
        
        if (data.reasons && data.reasons.length > 0) {
            html += `<div class="alerts">`;
            data.reasons.forEach(r => {
                html += `<div class="alert-item">${r}</div>`;
            });
            html += `</div>`;
        }
        
        if (data.warnings && data.warnings.length > 0) {
            html += `<div class="alerts" style="margin-top: 12px;">`;
            data.warnings.forEach(w => {
                html += `<div class="warning-item">${w}</div>`;
            });
            html += `</div>`;
        }
        
        html += `</div>`;
        resultsDiv.innerHTML = html;
        
    } catch (err) {
        resultsDiv.innerHTML = `<div class="alert-item">Error connecting to server. Is it running?</div>`;
    }
});
