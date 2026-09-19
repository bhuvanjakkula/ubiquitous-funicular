const runBtn = document.getElementById('run-btn');
const repairBtn = document.getElementById('repair-btn');
const scenarioSelect = document.getElementById('scenario-select');
const loading = document.getElementById('loading');
const resultsArea = document.getElementById('results-area');
const repairPanel = document.getElementById('repair-panel');

// Stats
const statHorizon = document.getElementById('stat-horizon');
const statTStar = document.getElementById('stat-tstar');
const statViolated = document.getElementById('stat-violated');
const explanationText = document.getElementById('explanation-text');
const timelineContainer = document.getElementById('timeline-container');

// Repair UI
const repairCost = document.getElementById('repair-cost');
const repairDesc = document.getElementById('repair-desc');
const repairHorizon = document.getElementById('repair-horizon');
const repairActions = document.getElementById('repair-actions');

runBtn.addEventListener('click', async () => {
    const scenario = scenarioSelect.value;
    
    // UI State
    resultsArea.classList.add('hidden');
    repairPanel.classList.add('hidden');
    loading.classList.remove('hidden');
    repairBtn.disabled = true;

    try {
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario })
        });
        
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        
        renderResults(data);
        
        // Enable repair button if there's a break
        if (data.result.t_star !== null) {
            repairBtn.disabled = false;
        }

    } catch (err) {
        alert("Error running engine: " + err.message);
    } finally {
        loading.classList.add('hidden');
    }
});

repairBtn.addEventListener('click', async () => {
    const scenario = scenarioSelect.value;
    repairBtn.disabled = true;
    
    try {
        const response = await fetch('/api/repair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario })
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "Failed to fetch repair");
        }
        
        const data = await response.json();
        renderRepair(data);
    } catch (err) {
        alert("Error searching repair: " + err.message);
        repairBtn.disabled = false;
    }
});

function renderResults(data) {
    const res = data.result;
    
    // Summary Stats
    if (res.t_star === null) {
        statHorizon.textContent = "Open";
        statHorizon.className = "stat-value open";
        statTStar.textContent = "N/A";
        statTStar.className = "stat-value open";
        statViolated.textContent = "None";
    } else {
        statHorizon.textContent = res.horizon;
        statHorizon.className = "stat-value broken";
        statTStar.textContent = res.t_star;
        statTStar.className = "stat-value broken";
        statViolated.textContent = res.first_violated.join(', ');
    }

    explanationText.textContent = data.explanation;

    // Timeline
    timelineContainer.innerHTML = '';
    res.ticks.forEach(tick => {
        const el = document.createElement('div');
        el.className = `tick-box ${tick.guaranteed ? '' : 'violated'}`;
        
        const statusClass = tick.guaranteed ? 'status-ok' : 'status-fail';
        
        el.innerHTML = `
            <div class="tick-time">t = ${tick.t}</div>
            <div class="tick-worlds">${tick.world_count}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted)">worlds</div>
            <div class="tick-status ${statusClass}"></div>
        `;
        
        if (!tick.guaranteed) {
            el.title = "Violated: " + tick.violated.join(', ');
        }

        timelineContainer.appendChild(el);
    });

    resultsArea.classList.remove('hidden');
}

function renderRepair(data) {
    repairCost.textContent = `Cost: ${data.cost}`;
    repairDesc.textContent = data.description;
    repairHorizon.textContent = data.restored_horizon === null ? "Open" : `Extends through t=${data.restored_horizon}`;
    
    repairActions.innerHTML = '';
    data.dropped_actions.forEach(action => {
        const li = document.createElement('li');
        li.className = 'action-item';
        li.textContent = `Drop [${action.action}] for agent ${action.agent} at t=${action.t}`;
        repairActions.appendChild(li);
    });

    repairPanel.classList.remove('hidden');
    
    // Scroll to repair panel
    repairPanel.scrollIntoView({ behavior: 'smooth', block: 'end' });
}
