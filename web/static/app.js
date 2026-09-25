/**
 * Global Money Transfer Search - Comprehensive Worldwide Application Controller
 * Handles Authentication, Pro Tiers ($99 / $199), Owner SuperAdmin (bhuvanjakkula@gmail.com),
 * and 66+ Global Corridors.
 */

document.addEventListener("DOMContentLoaded", () => {
  const engine = window.GTS_ENGINE;
  if (!engine) {
    console.error("GTS_ENGINE not loaded!");
    return;
  }

  const OWNER_EMAIL = "bhuvanjakkula@gmail.com";

  // --- Auth State ---
  let currentUser = null;
  try {
    const saved = localStorage.getItem("gts_user");
    if (saved) currentUser = JSON.parse(saved);
  } catch (e) {
    currentUser = null;
  }

  // --- DOM Elements ---
  const brandHomeLink = document.getElementById("brand-home-link");
  const btnResetForm = document.getElementById("btn-reset-form");
  const toggleArchBtn = document.getElementById("toggle-arch-btn");
  const archFlowSection = document.getElementById("arch-flow-section");
  const rateAlertBtn = document.getElementById("rate-alert-btn");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeIcon = document.getElementById("theme-icon");
  const liveTicker = document.getElementById("live-ticker");
  const tickerRatePair = document.getElementById("ticker-rate-pair");
  const pricingPlansBtn = document.getElementById("pricing-plans-btn");
  const authHeaderContainer = document.getElementById("auth-header-container");
  const btnBannerLogin = document.getElementById("btn-banner-login");

  const fromCountrySelect = document.getElementById("from-country-select");
  const toCountrySelect = document.getElementById("to-country-select");
  const btnSwapCountries = document.getElementById("btn-swap-countries");
  const amountInput = document.getElementById("amount-input");
  const sendCurrencyLabel = document.getElementById("send-currency-label");
  const receiveMethodSelect = document.getElementById("receive-method-select");
  const prioritySelect = document.getElementById("priority-select");
  const searchForm = document.getElementById("transfer-search-form");
  const btnSubmitSearch = document.getElementById("btn-submit-search");

  const resultsList = document.getElementById("providers-results-list");
  const resultsCountBadge = document.getElementById("results-count-badge");
  const payoutBarsContainer = document.getElementById("payout-bars-container");
  const pipelineStatus = document.getElementById("pipeline-status");
  const pipeDescQuery = document.getElementById("pipe-desc-query");
  const pipeDescRules = document.getElementById("pipe-desc-rules");
  const pipeDescPricing = document.getElementById("pipe-desc-pricing");

  const apiInspectorToggle = document.getElementById("toggle-api-inspector");
  const apiInspectorContent = document.getElementById("api-inspector-content");
  const apiJsonPre = document.getElementById("api-json-pre");

  // Modals
  const authModal = document.getElementById("auth-modal");
  const closeAuthModal = document.getElementById("close-auth-modal");
  const tabSigninBtn = document.getElementById("tab-signin-btn");
  const tabSignupBtn = document.getElementById("tab-signup-btn");
  const signinForm = document.getElementById("signin-form");
  const signupForm = document.getElementById("signup-form");
  const btnQuickOwnerSignin = document.getElementById("btn-quick-owner-signin");

  const pricingModal = document.getElementById("pricing-modal");
  const closePricingModal = document.getElementById("close-pricing-modal");

  const adminModal = document.getElementById("admin-modal");
  const closeAdminModal = document.getElementById("close-admin-modal");
  const adminTotalUsers = document.getElementById("admin-total-users");
  const adminPaidUsers = document.getElementById("admin-paid-users");
  const adminMrr = document.getElementById("admin-mrr");
  const adminUsersTableBody = document.getElementById("admin-users-table-body");
  const btnToggleGlobalLock = document.getElementById("btn-toggle-global-lock");
  const adminGlobalLockStatus = document.getElementById("admin-global-lock-status");

  const handoffModal = document.getElementById("handoff-modal");
  const closeHandoffModal = document.getElementById("close-handoff-modal");
  const modalProviderName = document.getElementById("modal-provider-name");
  const modalSendAmt = document.getElementById("modal-send-amt");
  const modalRecvAmt = document.getElementById("modal-recv-amt");
  const modalFee = document.getElementById("modal-fee");
  const modalRate = document.getElementById("modal-rate");
  const modalReqList = document.getElementById("modal-req-list");
  const modalRedirectBtn = document.getElementById("modal-redirect-btn");

  const rateAlertModal = document.getElementById("rate-alert-modal");
  const closeAlertModal = document.getElementById("close-alert-modal");
  const alertPairInput = document.getElementById("alert-pair-input");
  const alertCurrentRate = document.getElementById("alert-current-rate");
  const alertForm = document.getElementById("rate-alert-form");

  const infoModal = document.getElementById("info-modal");
  const closeInfoModal = document.getElementById("close-info-modal");
  const closeInfoModalBtn = document.getElementById("close-info-modal-btn");
  const infoModalBadge = document.getElementById("info-modal-badge");
  const infoModalTitle = document.getElementById("info-modal-title");
  const infoModalSubtitle = document.getElementById("info-modal-subtitle");
  const infoModalBody = document.getElementById("info-modal-body");

  const toastContainer = document.getElementById("toast-container");

  let currentResults = [];
  let currentFilter = "all";
  let globalTrialLocked = false;

  // --- Populate Country Dropdowns with ALL 66+ Countries ---
  function populateCountryDropdowns() {
    const continents = ["Middle East", "Asia", "Europe", "Americas", "Africa", "Oceania"];

    function buildOptions(selectedCode) {
      let html = "";
      for (const continent of continents) {
        const list = engine.ALL_COUNTRIES.filter(c => c.continent === continent);
        if (list.length === 0) continue;
        html += `<optgroup label="── ${continent.toUpperCase()} ──">`;
        for (const c of list) {
          const isSel = c.code === selectedCode ? "selected" : "";
          html += `<option value="${c.code}" data-currency="${c.currency}" ${isSel}>${c.flag} ${c.shortName} (${c.currency})</option>`;
        }
        html += `</optgroup>`;
      }
      return html;
    }

    fromCountrySelect.innerHTML = buildOptions("AE");
    toCountrySelect.innerHTML = buildOptions("PH");
  }

  // --- Toast Notification Helper ---
  function showToast(message, type = "success") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.style.padding = "12px 18px";
    toast.style.background = type === "success" ? "rgba(16, 185, 129, 0.95)" : type === "error" ? "rgba(239, 68, 68, 0.95)" : "rgba(37, 99, 235, 0.95)";
    toast.style.color = "#fff";
    toast.style.borderRadius = "8px";
    toast.style.fontSize = "0.85rem";
    toast.style.fontWeight = "700";
    toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "8px";
    toast.style.animation = "fadeIn 0.2s ease-in-out";
    toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ'}</span> ${message}`;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- Auth UI Management ---
  function updateAuthHeader() {
    if (!authHeaderContainer) return;

    if (!currentUser) {
      authHeaderContainer.innerHTML = `
        <button type="button" class="btn-header" id="btn-open-login" style="background: rgba(37,99,235,0.15); border-color: var(--accent-blue); color: var(--accent-cyan); font-weight: 700;">
          <span>👤</span> Sign In
        </button>
      `;
      const btnOpenLogin = document.getElementById("btn-open-login");
      if (btnOpenLogin) {
        btnOpenLogin.addEventListener("click", () => {
          authModal.classList.add("open");
        });
      }
      if (btnBannerLogin) btnBannerLogin.textContent = "Sign In / Sign Up ➔";
    } else {
      const isOwner = currentUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
      const planBadge = isOwner 
        ? `<span style="background: rgba(16,185,129,0.2); color: var(--accent-emerald); border: 1px solid rgba(16,185,129,0.4); padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 800;">👑 OWNER VIP</span>`
        : currentUser.plan === "business"
        ? `<span style="background: rgba(139,92,246,0.2); color: var(--accent-purple); border: 1px solid rgba(139,92,246,0.4); padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 800;">BUSINESS ($199)</span>`
        : currentUser.plan === "individual"
        ? `<span style="background: rgba(37,99,235,0.2); color: var(--accent-cyan); border: 1px solid rgba(37,99,235,0.4); padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 800;">PRO ($99)</span>`
        : `<span style="background: rgba(245,158,11,0.2); color: var(--accent-amber); border: 1px solid rgba(245,158,11,0.4); padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 800;">TRIAL</span>`;

      authHeaderContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="display: flex; flex-direction: column; align-items: flex-end;">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-main);">${currentUser.name ? currentUser.name.split(" ")[0] : "User"}</span>
            ${planBadge}
          </div>

          ${isOwner ? `
            <button type="button" class="btn-header" id="btn-open-admin" style="background: rgba(16,185,129,0.2); border-color: var(--accent-emerald); color: var(--accent-emerald); font-weight: 800;">
              👑 Admin Dashboard
            </button>
          ` : ''}

          ${!isOwner && currentUser.plan === "trial" ? `
            <button type="button" class="btn-header" id="btn-upgrade-user" style="background: linear-gradient(135deg, #2563eb, #06b6d4); color: #fff; font-weight: 800;">
              ⚡ Upgrade
            </button>
          ` : ''}

          <button type="button" class="btn-header" id="btn-logout-user" title="Sign Out" style="padding: 8px 12px;">
            🚪
          </button>
        </div>
      `;

      if (isOwner) {
        const btnAdmin = document.getElementById("btn-open-admin");
        if (btnAdmin) btnAdmin.addEventListener("click", openAdminDashboard);
      }
      const btnUp = document.getElementById("btn-upgrade-user");
      if (btnUp) {
        btnUp.addEventListener("click", () => pricingModal.classList.add("open"));
      }
      const btnLogout = document.getElementById("btn-logout-user");
      if (btnLogout) btnLogout.addEventListener("click", handleLogout);
      if (btnBannerLogin) btnBannerLogin.textContent = `Logged in as ${currentUser.name ? currentUser.name.split(" ")[0] : "User"}`;
    }
  }

  function handleLogout() {
    currentUser = null;
    localStorage.removeItem("gts_user");
    updateAuthHeader();
    showToast("Signed out successfully");
  }

  // --- Currency Helpers ---
  function getCurrencyForCode(code) {
    const c = engine.ALL_COUNTRIES.find(x => x.code === code);
    return c ? c.currency : "USD";
  }

  function updateCurrencyLabels() {
    const fromCode = fromCountrySelect.value;
    const sendCurrency = getCurrencyForCode(fromCode);
    sendCurrencyLabel.textContent = sendCurrency;

    const toCode = toCountrySelect.value;
    const recvCurrency = getCurrencyForCode(toCode);

    const midRate = engine.getCrossRate(sendCurrency, recvCurrency);

    tickerRatePair.textContent = `1 ${sendCurrency} = ${midRate.toFixed(4)} ${recvCurrency}`;
    if (alertCurrentRate) alertCurrentRate.textContent = midRate.toFixed(4);
    if (alertPairInput) alertPairInput.value = `${sendCurrency} ➔ ${recvCurrency}`;
  }

  // --- Main Search Algorithm Execution ---
  async function executeSearch() {
    // Check if user is locked
    if (currentUser) {
      if (currentUser.isLocked) {
        showToast("Your account search access is locked by admin.", "error");
        return;
      }
      if (globalTrialLocked && currentUser.role !== "owner" && currentUser.plan === "trial") {
        pricingModal.classList.add("open");
        showToast("Free trial has ended. Please upgrade to Pro Individual ($99/mo) or Pro Business ($199/mo).", "error");
        return;
      }
    }

    const fromCountry = fromCountrySelect.value;
    const toCountry = toCountrySelect.value;
    const amount = parseFloat(amountInput.value) || 0;
    const sendCurrency = getCurrencyForCode(fromCountry);
    const receiveCurrency = getCurrencyForCode(toCountry);
    const receiveMethod = receiveMethodSelect.value || undefined;
    const priority = prioritySelect.value || "most_received";

    const searchObj = {
      fromCountry,
      toCountry,
      amount,
      sendCurrency,
      receiveCurrency,
      receiveMethod,
      priority
    };

    const fromObj = engine.ALL_COUNTRIES.find(c => c.code === fromCountry) || { shortName: fromCountry };
    const toObj = engine.ALL_COUNTRIES.find(c => c.code === toCountry) || { shortName: toCountry };

    pipeDescQuery.textContent = `${fromObj.shortName} ➔ ${toObj.shortName} (${sendCurrency} ${amount.toLocaleString()})`;

    // Try API search with fallback to local client-side engine
    let results = [];
    try {
      const headers = { "Content-Type": "application/json" };
      if (currentUser && currentUser.email) headers["X-User-Email"] = currentUser.email;

      const res = await fetch("/api/search", {
        method: "POST",
        headers,
        body: JSON.stringify(searchObj)
      });
      if (res.ok) {
        const data = await res.json();
        results = data.results || [];
      } else if (res.status === 403) {
        const err = await res.json();
        pricingModal.classList.add("open");
        showToast(err.detail || "Upgrade to Pro to search this corridor.", "error");
        return;
      } else {
        results = engine.findTransferOptions(engine.GLOBAL_PROVIDERS, searchObj);
      }
    } catch (e) {
      results = engine.findTransferOptions(engine.GLOBAL_PROVIDERS, searchObj);
    }

    currentResults = results;

    let displayedResults = results;
    if (currentFilter !== "all") {
      displayedResults = results.filter(r => r.receiveMethods && r.receiveMethods.includes(currentFilter));
    }

    pipelineStatus.textContent = `Engine Active • ${results.length} Eligible of ${engine.GLOBAL_PROVIDERS.length} Worldwide Providers`;
    pipeDescRules.textContent = `${results.length} Eligible Providers`;

    if (results.length > 0) {
      pipeDescPricing.textContent = `Top Payout: ${receiveCurrency} ${results[0].recipientGets.toLocaleString()}`;
    } else {
      pipeDescPricing.textContent = "No corridor match";
    }

    renderResults(displayedResults, sendCurrency, receiveCurrency);
    renderVisualChart(displayedResults, receiveCurrency);
    updateApiInspector(searchObj, results);
  }

  // --- Render Results Cards ---
  function renderResults(results, sendCurrency, receiveCurrency) {
    resultsCountBadge.textContent = `${results.length} Options`;

    if (results.length === 0) {
      resultsList.innerHTML = `
        <div class="provider-card" style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
          <h3 style="font-size: 1.2rem; margin-bottom: 8px;">No transfer options found for this specific route</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 480px; margin: 0 auto 16px;">
            Certain country combinations require specialized local bank clearing rails or higher transfer amounts.
          </p>
          <button type="button" class="btn-continue" id="btn-empty-reset" style="margin: 0 auto; display: inline-flex; padding: 10px 20px;">
            Reset to Popular Corridor (UAE ➔ Philippines)
          </button>
        </div>
      `;
      const btnEmptyReset = document.getElementById("btn-empty-reset");
      if (btnEmptyReset) {
        btnEmptyReset.addEventListener("click", resetToDefaults);
      }
      return;
    }

    resultsList.innerHTML = results.map((item, index) => {
      const isWinner = index === 0 && prioritySelect.value === "most_received";
      const badgesHtml = item.badges.map(b => {
        let cls = "winner";
        if (b.includes("Zero")) cls = "zero-fee";
        if (b.includes("Fastest")) cls = "fast";
        return `<span class="badge-tag ${cls}">${b}</span>`;
      }).join("");

      const senderReqs = item.requirements && item.requirements.sender 
        ? item.requirements.sender.map(s => `<li>${s}</li>`).join("") 
        : "<li>Valid National ID or Passport verification</li>";

      const recipientReqs = item.requirements && item.requirements.recipient 
        ? item.requirements.recipient.map(r => `<li>${r}</li>`).join("") 
        : "<li>Government photo ID matching legal name or bank account</li>";

      const methodsHtml = item.receiveMethods ? item.receiveMethods.map(m => {
        const icons = { bank: "🏦 Bank Deposit", cash: "💵 Cash Pickup", wallet: "📱 Mobile Wallet", card: "💳 Card Transfer" };
        return `<span style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">${icons[m] || m}</span>`;
      }).join(" ") : "";

      return `
        <div class="provider-card ${isWinner ? 'featured' : ''}" data-id="${item.providerId}">
          
          ${item.badges.length > 0 ? `<div class="card-badges-row">${badgesHtml}</div>` : ''}

          <div class="card-main-grid">
            
            <div class="provider-brand">
              <div class="provider-logo-box" style="border-left: 4px solid ${item.logoColor || 'var(--accent-blue)'}">
                ${item.logoText}
              </div>
              <div class="provider-meta">
                <h3>${item.providerName}</h3>
                <a href="${item.providerWebsite}" target="_blank" rel="noopener noreferrer" class="provider-site-link" title="Visit ${item.providerName} Official Website">
                  Official Portal ↗
                </a>
              </div>
            </div>

            <div class="provider-metrics">
              
              <div class="metric-item">
                <span class="metric-label">Recipient Gets</span>
                <span class="metric-val payout">${receiveCurrency} ${item.recipientGets.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                <span class="metric-sub">Net payout after all fees</span>
              </div>

              <div class="metric-item">
                <span class="metric-label">Transfer Fee</span>
                <span class="metric-val" style="${item.fee === 0 ? 'color: var(--accent-emerald)' : ''}">
                  ${item.fee === 0 ? 'FREE (0.00)' : `${sendCurrency} ${item.fee.toFixed(2)}`}
                </span>
                <span class="metric-sub">Upfront cost</span>
              </div>

              <div class="metric-item">
                <span class="metric-label">Exchange Rate</span>
                <span class="metric-val">1 ${sendCurrency} = ${item.exchangeRate.toFixed(4)}</span>
                <span class="metric-sub" style="color: ${item.fxMarkupPercentage <= 0.1 ? 'var(--accent-emerald)' : 'var(--text-dim)'}">
                  ${item.fxMarkupPercentage <= 0.1 ? '✓ True Mid-Market' : `${item.fxMarkupPercentage}% FX Margin`}
                </span>
                <span style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 700; margin-top: 3px;">
                  Total Cost: ${sendCurrency} ${item.totalCost.toFixed(2)}
                </span>
              </div>

              <div class="metric-item">
                <span class="metric-label">Delivery Speed</span>
                <span class="metric-val" style="font-size: 0.95rem;">${item.speedText || item.speedLabel}</span>
                <span class="metric-sub">Est. clearing time</span>
              </div>

            </div>

            <div class="provider-cta-box">
              <button type="button" class="btn-continue btn-open-handoff" 
                data-provider="${item.providerName}"
                data-send="${sendCurrency} ${amountInput.value}"
                data-recv="${receiveCurrency} ${item.recipientGets.toLocaleString(undefined, {minimumFractionDigits: 2})}"
                data-fee="${item.fee === 0 ? 'FREE (0.00)' : `${sendCurrency} ${item.fee.toFixed(2)}`}"
                data-rate="1 ${sendCurrency} = ${item.exchangeRate.toFixed(4)} ${receiveCurrency}"
                data-url="${item.transferUrl}"
                data-sender-reqs='${JSON.stringify(item.requirements?.sender || [])}'
                data-recipient-reqs='${JSON.stringify(item.requirements?.recipient || [])}'
              >
                Continue to provider ➔
              </button>
              
              <button type="button" class="btn-details-toggle" data-target="drawer-${item.providerId}">
                <span>▼</span> Requirements & Payouts
              </button>
            </div>

          </div>

          <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">PAYOUT RAILS:</span>
            ${methodsHtml}
          </div>

          <div class="provider-details-drawer" id="drawer-${item.providerId}">
            <div class="details-grid">
              <div class="req-box">
                <div class="req-title">👤 Sender Requirements:</div>
                <ul class="req-list">${senderReqs}</ul>
              </div>
              <div class="req-box">
                <div class="req-title">📥 Recipient Requirements:</div>
                <ul class="req-list">${recipientReqs}</ul>
              </div>
            </div>
          </div>

        </div>
      `;
    }).join("");

    // Reattach Drawer Handlers
    document.querySelectorAll(".btn-details-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        if (targetId) {
          const drawer = document.getElementById(targetId);
          if (drawer) {
            const isOpen = drawer.classList.contains("open");
            drawer.classList.toggle("open");
            btn.querySelector("span").textContent = isOpen ? "▼" : "▲";
          }
        }
      });
    });

    // Reattach Handoff Modal Handlers
    document.querySelectorAll(".btn-open-handoff").forEach(btn => {
      btn.addEventListener("click", () => {
        modalProviderName.textContent = `Continue with ${btn.getAttribute("data-provider")}`;
        modalSendAmt.textContent = btn.getAttribute("data-send");
        modalRecvAmt.textContent = btn.getAttribute("data-recv");
        modalFee.textContent = btn.getAttribute("data-fee");
        modalRate.textContent = btn.getAttribute("data-rate");
        modalRedirectBtn.href = btn.getAttribute("data-url");

        try {
          const senderReqs = JSON.parse(btn.getAttribute("data-sender-reqs") || "[]");
          const recipientReqs = JSON.parse(btn.getAttribute("data-recipient-reqs") || "[]");
          const combined = [...senderReqs, ...recipientReqs];
          if (combined.length > 0) {
            modalReqList.innerHTML = combined.map(c => `<li>✓ ${c}</li>`).join("");
          } else {
            modalReqList.innerHTML = "<li>✓ Valid Government Photo ID ready</li><li>✓ Recipient Account / Wallet details ready</li>";
          }
        } catch (e) {
          modalReqList.innerHTML = "<li>✓ Valid Government Photo ID ready</li>";
        }

        handoffModal.classList.add("open");
      });
    });
  }

  // --- Visual Payout Chart ---
  function renderVisualChart(results, receiveCurrency) {
    if (results.length === 0) {
      payoutBarsContainer.innerHTML = "<p style='color: var(--text-dim); font-size: 0.85rem;'>No active quotes</p>";
      return;
    }

    const maxVal = Math.max(...results.map(r => r.recipientGets));

    payoutBarsContainer.innerHTML = results.slice(0, 5).map(item => {
      const percentage = Math.max(25, (item.recipientGets / maxVal) * 100);
      const isTop = item.recipientGets === maxVal;
      return `
        <div class="payout-bar-item" style="cursor: pointer;" title="Click to view ${item.providerName}">
          <div class="bar-provider-name">${item.providerName}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${percentage}%; ${isTop ? 'background: linear-gradient(90deg, #10b981, #06b6d4);' : ''}">
              ${item.speedText || item.speedLabel}
            </div>
          </div>
          <div class="bar-amount">${receiveCurrency} ${item.recipientGets.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </div>
      `;
    }).join("");
  }

  // --- Developer API Inspector ---
  function updateApiInspector(searchObj, results) {
    if (!apiJsonPre) return;
    const payload = {
      timestamp: new Date().toISOString(),
      userSession: currentUser ? { email: currentUser.email, plan: currentUser.plan, role: currentUser.role } : "Guest Trial",
      globalCorridorSearch: {
        fromCountry: searchObj.fromCountry,
        toCountry: searchObj.toCountry,
        amount: searchObj.amount,
        sendCurrency: searchObj.sendCurrency,
        receiveCurrency: searchObj.receiveCurrency,
        liveMidMarketRate: engine.getCrossRate(searchObj.sendCurrency, searchObj.receiveCurrency)
      },
      totalEligibleProviders: results.length,
      topQuotes: results.slice(0, 3).map(r => ({
        providerId: r.providerId,
        providerName: r.providerName,
        fee: r.fee,
        exchangeRate: r.exchangeRate,
        recipientGets: r.recipientGets,
        speed: r.speedText || r.speedLabel,
        transferUrl: r.transferUrl
      }))
    };
    apiJsonPre.textContent = JSON.stringify(payload, null, 2);
  }

  // --- Reset to Default Form Values ---
  function resetToDefaults() {
    fromCountrySelect.value = "AE";
    toCountrySelect.value = "PH";
    amountInput.value = "5000";
    receiveMethodSelect.value = "";
    prioritySelect.value = "most_received";
    currentFilter = "all";

    document.querySelectorAll(".filter-chip").forEach(c => {
      c.classList.toggle("active", c.getAttribute("data-filter") === "all");
    });

    document.querySelectorAll(".amount-pill").forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-amt") === "5000");
    });

    document.querySelectorAll(".preset-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-from") === "AE" && b.getAttribute("data-to") === "PH");
    });

    updateCurrencyLabels();
    executeSearch();
    showToast("Reset to UAE ➔ Philippines (AED 5,000)");
  }

  // --- Owner Super Admin Dashboard Logic ---
  async function openAdminDashboard() {
    if (!currentUser || currentUser.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      showToast("Access denied: Owner privileges required.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?email=${encodeURIComponent(OWNER_EMAIL)}`);
      if (!res.ok) throw new Error("Failed to load admin telemetry");
      const data = await res.json();

      globalTrialLocked = data.globalTrialLock;
      adminTotalUsers.textContent = data.totalUsers;
      adminPaidUsers.textContent = data.activeSubscribers;
      adminMrr.textContent = `$${data.totalRevenueMonthlyUSD.toLocaleString()} USD`;

      adminGlobalLockStatus.textContent = globalTrialLocked ? "Trial Locked (Pro Required)" : "All Users Can Access Trial";
      adminGlobalLockStatus.style.color = globalTrialLocked ? "#ef4444" : "var(--accent-emerald)";
      btnToggleGlobalLock.textContent = globalTrialLocked ? "Unlock All Trial Users" : "Lock All Trial Users";
      btnToggleGlobalLock.style.background = globalTrialLocked ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)";
      btnToggleGlobalLock.style.color = globalTrialLocked ? "var(--accent-emerald)" : "#ef4444";

      renderAdminUsersTable(data.users);
      adminModal.classList.add("open");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  function renderAdminUsersTable(users) {
    adminUsersTableBody.innerHTML = users.map(u => {
      const isOwner = u.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px 12px;">
            <strong>${u.name}</strong><br>
            <span style="color: var(--text-dim); font-size: 0.72rem;">${u.email}</span>
          </td>
          <td style="padding: 10px 12px; font-family: monospace;">${u.countryCode} ${u.mobileNumber}</td>
          <td style="padding: 10px 12px;">
            <span style="font-weight: 700; color: ${u.plan === 'business' ? 'var(--accent-purple)' : u.plan === 'individual' ? 'var(--accent-cyan)' : isOwner ? 'var(--accent-emerald)' : 'var(--text-dim)'}">
              ${u.planName}
            </span>
          </td>
          <td style="padding: 10px 12px; font-weight: 700;">$${u.priceMonthly}/mo</td>
          <td style="padding: 10px 12px;">${u.searchesCount || 0}</td>
          <td style="padding: 10px 12px;">
            <span style="color: ${u.isLocked ? '#ef4444' : 'var(--accent-emerald)'}; font-weight: 700;">
              ${u.isLocked ? '🔒 Locked' : '✓ Active'}
            </span>
          </td>
          <td style="padding: 10px 12px; text-align: right;">
            ${isOwner ? '<span style="color: var(--accent-emerald); font-size: 0.75rem;">Lifetime VIP</span>' : `
              <button type="button" class="btn-toggle-user-lock" data-uid="${u.id}" data-locked="${u.isLocked}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer; background: ${u.isLocked ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color: ${u.isLocked ? 'var(--accent-emerald)' : '#ef4444'}; border: 1px solid ${u.isLocked ? 'var(--accent-emerald)' : '#ef4444'};">
                ${u.isLocked ? 'Unlock' : 'Lock User'}
              </button>
            `}
          </td>
        </tr>
      `;
    }).join("");

    document.querySelectorAll(".btn-toggle-user-lock").forEach(btn => {
      btn.addEventListener("click", async () => {
        const uid = btn.getAttribute("data-uid");
        const currentLocked = btn.getAttribute("data-locked") === "true";
        try {
          const res = await fetch("/api/admin/toggle-lock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              adminEmail: OWNER_EMAIL,
              targetUserId: uid,
              isLocked: !currentLocked
            })
          });
          if (res.ok) {
            showToast(`User ${!currentLocked ? 'Locked' : 'Unlocked'}`);
            openAdminDashboard();
          }
        } catch (e) {
          showToast(e.message, "error");
        }
      });
    });
  }

  // --- Toggle Global Trial Lock ---
  btnToggleGlobalLock.addEventListener("click", async () => {
    try {
      const nextState = !globalTrialLocked;
      const res = await fetch("/api/admin/toggle-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: OWNER_EMAIL,
          targetUserId: "GLOBAL",
          isLocked: nextState
        })
      });
      if (res.ok) {
        globalTrialLocked = nextState;
        showToast(nextState ? "All trial users are now locked (Pro required)!" : "Trial access unlocked for all users!");
        openAdminDashboard();
      }
    } catch (e) {
      showToast(e.message, "error");
    }
  });

  // --- Stripe Payment Links Configuration ---
  const STRIPE_CHECKOUT_URLS = {
    individual: "https://buy.stripe.com/test_4gM28j1T84dLg9x1VY2oE0d",
    business: "https://buy.stripe.com/test_bJe3cn55k4dL5uTeIK2oE0e"
  };

  // --- Plan Upgrade Subscription Handler ---
  document.querySelectorAll(".btn-subscribe-plan").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const plan = btn.getAttribute("data-plan") || "individual";
      const price = btn.getAttribute("data-price") || (plan === "business" ? "199" : "99");
      const stripeUrl = STRIPE_CHECKOUT_URLS[plan] || btn.getAttribute("href") || "https://buy.stripe.com/test_4gM28j1T84dLg9x1VY2oE0d";

      if (currentUser && currentUser.email && currentUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
        e.preventDefault();
        showToast("You are the platform owner with permanent lifetime VIP access!", "success");
        pricingModal.classList.remove("open");
        return;
      }

      let checkoutUrl = stripeUrl;
      if (currentUser && currentUser.email) {
        // Pre-fill email in Stripe checkout URL
        checkoutUrl += `${checkoutUrl.includes("?") ? "&" : "?"}prefilled_email=${encodeURIComponent(currentUser.email)}`;

        // Sync subscription upgrade state in backend
        try {
          fetch("/api/auth/upgrade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: currentUser.email,
              plan: plan
            })
          }).then(res => res.json()).then(data => {
            if (data && data.user) {
              currentUser = data.user;
              localStorage.setItem("gts_user", JSON.stringify(currentUser));
              updateAuthHeader();
            }
          }).catch(() => {});
        } catch (_) {}
      }

      pricingModal.classList.remove("open");
      showToast(`Redirecting to secure Stripe Checkout ($${price} USD/mo)...`, "info");

      // Open secure Stripe Checkout in new tab
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      e.preventDefault();
    });
  });

  // --- Auth Modal Tab Switching ---
  tabSigninBtn.addEventListener("click", () => {
    tabSigninBtn.style.background = "rgba(37,99,235,0.15)";
    tabSigninBtn.style.borderColor = "var(--accent-blue)";
    tabSigninBtn.style.color = "var(--accent-cyan)";

    tabSignupBtn.style.background = "var(--bg-glass)";
    tabSignupBtn.style.borderColor = "var(--border-color)";
    tabSignupBtn.style.color = "var(--text-muted)";

    signinForm.style.display = "block";
    signupForm.style.display = "none";
  });

  tabSignupBtn.addEventListener("click", () => {
    tabSignupBtn.style.background = "rgba(37,99,235,0.15)";
    tabSignupBtn.style.borderColor = "var(--accent-blue)";
    tabSignupBtn.style.color = "var(--accent-cyan)";

    tabSigninBtn.style.background = "var(--bg-glass)";
    tabSigninBtn.style.borderColor = "var(--border-color)";
    tabSigninBtn.style.color = "var(--text-muted)";

    signupForm.style.display = "block";
    signinForm.style.display = "none";
  });

  // --- Sign In Submission ---
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signin-email").value;
    const password = document.getElementById("signin-password").value;

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        localStorage.setItem("gts_user", JSON.stringify(currentUser));
        updateAuthHeader();
        authModal.classList.remove("open");
        showToast(`Welcome back, ${currentUser.name}!`, "success");
        executeSearch();
      } else {
        const err = await res.json();
        showToast(err.detail || "Sign in failed.", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // --- Quick 1-Click Owner Sign In ---
  if (btnQuickOwnerSignin) {
    btnQuickOwnerSignin.addEventListener("click", async () => {
      document.getElementById("signin-email").value = OWNER_EMAIL;
      document.getElementById("signin-password").value = "admin123";
      signinForm.dispatchEvent(new Event("submit"));
    });
  }

  // --- Sign Up Submission ---
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const countryCode = document.getElementById("signup-country-code").value;
    const mobileNumber = document.getElementById("signup-mobile").value;
    const password = document.getElementById("signup-password").value;

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, countryCode, mobileNumber, password })
      });

      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        localStorage.setItem("gts_user", JSON.stringify(currentUser));
        updateAuthHeader();
        authModal.classList.remove("open");
        showToast(`Account created! Welcome, ${currentUser.name}.`, "success");
        executeSearch();
      } else {
        const err = await res.json();
        showToast(err.detail || "Sign up failed.", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  // --- Topic Info Modal Handler ---
  const topicData = {
    rules: {
      badge: "RULES ENGINE",
      title: "Global Eligibility & Rules Engine",
      subtitle: "Evaluates corridor licenses, limits, and payout rails worldwide",
      content: `
        <p><strong>Universal Rules Engine Capabilities:</strong></p>
        <ul style="padding-left: 20px; margin-top: 8px; margin-bottom: 12px;">
          <li><strong>66+ Sending & Receiving Countries:</strong> Dynamic validation of regulatory clearing between all pairs globally.</li>
          <li><strong>Amount Bound Check:</strong> Ensures send amounts meet provider minimums and maximum regulatory transfer limits.</li>
          <li><strong>Multi-Rail Routing:</strong> Filters Bank Account deposits, Mobile Wallets (GCash, Maya, M-Pesa), and Cash Pickup at 500k+ global agent locations.</li>
        </ul>
      `
    },
    providers: {
      badge: "PROVIDER DB",
      title: "18 Verified Global Remittance Providers",
      subtitle: "Integrated directory with real-world website links, pricing, and clearing SLAs",
      content: `
        <p><strong>Active Integrated Providers:</strong></p>
        <p style="margin-top: 8px;">Wise, Western Union, MoneyGram, Remitly, WorldRemit, Ria Money Transfer, Revolut, OFX, Xe Money Transfer, TapTap Send, Instarem, Paysend, Al Ansari Exchange, LuLu Exchange, Hubpay, Pyypl, Xoom (PayPal), and Sendwave.</p>
      `
    },
    corridors: {
      badge: "CORRIDOR DB",
      title: "Universal Cross-Currency Matrix",
      subtitle: "Live benchmark rates across 50+ world currencies",
      content: `
        <p><strong>Global Cross-Currency Engine:</strong></p>
        <p style="margin-top: 8px;">Our platform uses live USD base rates to calculate exact real-world cross-rates for any corridor: <code>CrossRate(A &rarr; B) = USD_Rate(B) / USD_Rate(A)</code>.</p>
      `
    },
    pricing: {
      badge: "PRICING ENGINE",
      title: "Transparent Net Payout Formula",
      subtitle: "Revealing both upfront transfer fees and hidden FX margins",
      content: `
        <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; margin-bottom: 12px;">
          amountAfterFee = sendAmount - upfrontFee<br>
          recipientGets = amountAfterFee * (midMarketRate * (1 - fxMargin))<br>
          netCost = upfrontFee + hiddenFxMarginCost
        </div>
      `
    },
    api: {
      badge: "DEVELOPER API",
      title: "Global Search REST API",
      subtitle: "Programmatic access to any corridor worldwide",
      content: `
        <p><strong>POST /api/search</strong></p>
        <div style="background: var(--bg-card); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.82rem; margin: 10px 0;">
          curl -X POST http://127.0.0.1:8000/api/search \\<br>
          &nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
          &nbsp;&nbsp;-d '{"fromCountry":"AE","toCountry":"PH","amount":5000}'
        </div>
      `
    }
  };

  function openInfoModal(topicKey) {
    const data = topicData[topicKey];
    if (!data) return;
    infoModalBadge.textContent = data.badge;
    infoModalTitle.textContent = data.title;
    infoModalSubtitle.textContent = data.subtitle;
    infoModalBody.innerHTML = data.content;
    infoModal.classList.add("open");
  }

  // --- Initialize UI ---
  populateCountryDropdowns();
  updateAuthHeader();

  // --- Event Listeners Binding ---

  if (btnBannerLogin) {
    btnBannerLogin.addEventListener("click", () => {
      if (!currentUser) authModal.classList.add("open");
      else if (currentUser.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) openAdminDashboard();
      else pricingModal.classList.add("open");
    });
  }

  pricingPlansBtn.addEventListener("click", () => {
    pricingModal.classList.add("open");
  });

  closeAuthModal.addEventListener("click", () => authModal.classList.remove("open"));
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) authModal.classList.remove("open");
  });

  closePricingModal.addEventListener("click", () => pricingModal.classList.remove("open"));
  pricingModal.addEventListener("click", (e) => {
    if (e.target === pricingModal) pricingModal.classList.remove("open");
  });

  closeAdminModal.addEventListener("click", () => adminModal.classList.remove("open"));
  adminModal.addEventListener("click", (e) => {
    if (e.target === adminModal) adminModal.classList.remove("open");
  });

  brandHomeLink.addEventListener("click", (e) => {
    e.preventDefault();
    resetToDefaults();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  btnResetForm.addEventListener("click", resetToDefaults);

  fromCountrySelect.addEventListener("change", () => {
    updateCurrencyLabels();
    executeSearch();
  });

  toCountrySelect.addEventListener("change", () => {
    updateCurrencyLabels();
    executeSearch();
  });

  if (btnSwapCountries) {
    btnSwapCountries.addEventListener("click", () => {
      const fromVal = fromCountrySelect.value;
      const toVal = toCountrySelect.value;
      fromCountrySelect.value = toVal;
      toCountrySelect.value = fromVal;
      updateCurrencyLabels();
      executeSearch();
      showToast("⇄ Swapped sending and receiving countries!");
    });
  }

  amountInput.addEventListener("input", () => {
    const val = amountInput.value;
    document.querySelectorAll(".amount-pill").forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-amt") === val);
    });
    executeSearch();
  });

  receiveMethodSelect.addEventListener("change", executeSearch);
  prioritySelect.addEventListener("change", executeSearch);

  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    executeSearch();
    showToast("Quotes refreshed!");
  });

  btnSubmitSearch.addEventListener("click", () => {
    btnSubmitSearch.style.transform = "scale(0.97)";
    setTimeout(() => btnSubmitSearch.style.transform = "", 150);
  });

  // Amount Pills
  document.querySelectorAll(".amount-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".amount-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      amountInput.value = pill.getAttribute("data-amt");
      executeSearch();
      showToast(`Amount set to ${sendCurrencyLabel.textContent} ${pill.getAttribute("data-amt")}`);
    });
  });

  // Popular Corridor Presets
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      fromCountrySelect.value = btn.getAttribute("data-from");
      toCountrySelect.value = btn.getAttribute("data-to");
      amountInput.value = btn.getAttribute("data-amt");

      updateCurrencyLabels();
      executeSearch();
      showToast(`Loaded ${btn.getAttribute("data-from")} ➔ ${btn.getAttribute("data-to")}`);
    });
  });

  // Filter Chips
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.getAttribute("data-filter");
      executeSearch();
      showToast(`Filter: ${chip.textContent.trim()}`);
    });
  });

  // Theme Toggle
  themeToggleBtn.addEventListener("click", () => {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    const nextTheme = isDark ? "light" : "dark";
    html.setAttribute("data-theme", nextTheme);
    themeIcon.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("gts_theme", nextTheme);
    showToast(`Switched to ${nextTheme} mode`);
  });

  const savedTheme = localStorage.getItem("gts_theme");
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
    themeIcon.textContent = savedTheme === "light" ? "☀️" : "🌙";
  }

  // Toggle Architecture Flow Banner
  toggleArchBtn.addEventListener("click", () => {
    const isHidden = archFlowSection.style.display === "none";
    archFlowSection.style.display = isHidden ? "block" : "none";
    toggleArchBtn.classList.toggle("active", isHidden);
    showToast(isHidden ? "System Architecture opened" : "System Architecture closed");
  });

  // Pipeline Step Nodes
  document.getElementById("pipe-step-1").addEventListener("click", () => openInfoModal("rules"));
  document.getElementById("pipe-step-2").addEventListener("click", () => openInfoModal("providers"));
  document.getElementById("pipe-step-3").addEventListener("click", () => openInfoModal("rules"));
  document.getElementById("pipe-step-4").addEventListener("click", () => openInfoModal("pricing"));
  document.getElementById("pipe-step-5").addEventListener("click", () => openInfoModal("api"));

  // Live Ticker & Rate Alert Modals
  liveTicker.addEventListener("click", () => {
    rateAlertModal.classList.add("open");
  });

  rateAlertBtn.addEventListener("click", () => {
    rateAlertModal.classList.add("open");
  });

  closeAlertModal.addEventListener("click", () => {
    rateAlertModal.classList.remove("open");
  });

  rateAlertModal.addEventListener("click", (e) => {
    if (e.target === rateAlertModal) rateAlertModal.classList.remove("open");
  });

  alertForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("alert-email").value;
    const target = document.getElementById("alert-target-rate").value;
    rateAlertModal.classList.remove("open");
    showToast(`Rate alert active! We'll notify ${email} at ${target}`, "success");
    alertForm.reset();
  });

  // Handoff Modal
  closeHandoffModal.addEventListener("click", () => {
    handoffModal.classList.remove("open");
  });

  handoffModal.addEventListener("click", (e) => {
    if (e.target === handoffModal) handoffModal.classList.remove("open");
  });

  modalRedirectBtn.addEventListener("click", () => {
    showToast("Redirecting to verified official portal...", "info");
    setTimeout(() => {
      handoffModal.classList.remove("open");
    }, 600);
  });

  // API Inspector Toggle
  apiInspectorToggle.addEventListener("click", () => {
    const isClosed = apiInspectorContent.style.display === "none";
    apiInspectorContent.style.display = isClosed ? "block" : "none";
    apiInspectorToggle.querySelector("span").textContent = isClosed ? "▼" : "▶";
  });

  // Footer Links
  document.querySelectorAll(".footer-modal-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const topic = link.getAttribute("data-topic");
      openInfoModal(topic);
    });
  });

  // Info Modal Close
  closeInfoModal.addEventListener("click", () => infoModal.classList.remove("open"));
  closeInfoModalBtn.addEventListener("click", () => infoModal.classList.remove("open"));
  infoModal.addEventListener("click", (e) => {
    if (e.target === infoModal) infoModal.classList.remove("open");
  });

  // Initial Load
  updateCurrencyLabels();
  executeSearch();
});
