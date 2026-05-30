const PREMIUM_LIMITS = {
  plans: 3,
  notes: 5,
  flashcards: 10,
  files: 0,
  groups: 1
};

function premiumUser() {
  return JSON.parse(localStorage.getItem("ss_current_user") || "null");
}

function premiumKey() {
  const user = premiumUser();
  return user ? "ss_premium_" + user.email : "ss_premium_guest";
}

function getPremiumStatus() {
  const status = JSON.parse(localStorage.getItem(premiumKey()) || "null");
  if (!status) return { plan: "free", paymentStatus: "none" };
  if (status.plan === "premium" && status.premiumExpiresAt && new Date(status.premiumExpiresAt) < new Date()) {
    return { plan: "free", paymentStatus: "expired" };
  }
  return status;
}

function isPremium() {
  return getPremiumStatus().plan === "premium";
}

function setPremiumStatus(status) {
  localStorage.setItem(premiumKey(), JSON.stringify(status));
}

function isNativeAndroidApp() {
  return Boolean(
    window.Capacitor ||
    window.STUDYSPHERE_MOBILE_BUILD ||
    /\bwv\b|Capacitor/i.test(navigator.userAgent)
  );
}

function apiUrl(path) {
  return (window.STUDYSPHERE_API_BASE || "") + path;
}

function canUsePremiumFeature(type, count) {
  if (isPremium()) return true;
  return count < (PREMIUM_LIMITS[type] || 0);
}

function showUpgradePrompt(featureName) {
  const prompt = document.createElement("div");
  prompt.className = "premium-lock";
  prompt.innerHTML = `
    <strong>${featureName} is a Premium feature</strong>
    <span>Upgrade to StudySphere Premium for KES 250/month to unlock this and more.</span>
    <a class="btn-primary" href="premium.html">View Premium</a>
  `;
  document.body.appendChild(prompt);
  setTimeout(() => prompt.remove(), 5200);
}

function initBilling() {
  const statusEl = document.getElementById("billing-status");
  if (!statusEl) return;

  renderBillingStatus();
  syncPremiumFromServer();

  if (isNativeAndroidApp()) {
    configureAndroidBillingNotice(statusEl);
    return;
  }

  const pesapalBtn = document.getElementById("pesapal-checkout-btn");
  if (pesapalBtn) {
    pesapalBtn.onclick = startPesapalCheckout;
  }

  const simulateBtn = document.getElementById("simulate-upgrade-btn");
  if (simulateBtn) simulateBtn.onclick = function() {
    if (!document.getElementById("billing-consent").checked) {
      statusEl.textContent = "Please confirm the simulated checkout notice first.";
      return;
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 1);
    setPremiumStatus({
      plan: "premium",
      price: 250,
      currency: "KES",
      paymentStatus: "simulated_paid",
      premiumStartedAt: now.toISOString(),
      premiumExpiresAt: expires.toISOString()
    });
    renderBillingStatus();
  };

  const cancelBtn = document.getElementById("cancel-premium-btn");
  if (cancelBtn) cancelBtn.onclick = function() {
    setPremiumStatus({
      plan: "free",
      paymentStatus: "cancelled",
      cancelledAt: new Date().toISOString()
    });
    renderBillingStatus();
  };
}

function configureAndroidBillingNotice(statusEl) {
  const pesapalBtn = document.getElementById("pesapal-checkout-btn");
  const simulateBtn = document.getElementById("simulate-upgrade-btn");
  const cancelBtn = document.getElementById("cancel-premium-btn");
  const consent = document.getElementById("billing-consent");

  if (pesapalBtn) pesapalBtn.style.display = "none";
  if (simulateBtn) simulateBtn.style.display = "none";
  if (cancelBtn) cancelBtn.style.display = "none";
  if (consent) consent.closest("label").style.display = "none";

  if (!isPremium()) {
    statusEl.innerHTML = `
      <strong>Android billing setup required</strong>
      <span>For the Google Play version, Premium purchases must use Google Play Billing. The free StudySphere tools work in this APK while Play Billing is being connected.</span>
    `;
  }
}

async function startPesapalCheckout() {
  const statusEl = document.getElementById("billing-status");
  const user = premiumUser();

  if (!user || !user.email) {
    statusEl.textContent = "Please log in as a student before upgrading.";
    return;
  }

  if (!document.getElementById("billing-consent").checked) {
    statusEl.textContent = "Please confirm the billing notice first.";
    return;
  }

  try {
    statusEl.textContent = "Creating secure Pesapal checkout...";
    const response = await fetch(apiUrl("/api/create-pesapal-order"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, name: user.name || "StudySphere Student" })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not start checkout.");
    window.location.href = data.url;
  } catch (error) {
    statusEl.innerHTML = `<strong>Pesapal checkout unavailable</strong><span>${error.message}</span>`;
  }
}

async function syncPremiumFromServer() {
  const user = premiumUser();
  if (!user || !user.email) return;

  try {
    const response = await fetch(apiUrl("/api/premium-status?email=" + encodeURIComponent(user.email)));
    if (!response.ok) return;
    const status = await response.json();
    if (status && status.plan === "premium") {
      setPremiumStatus({
        ...status,
        paymentStatus: status.paymentStatus || "server_verified"
      });
      renderBillingStatus();
    }
  } catch (error) {
    // Static hosting will not have the backend API. Keep local/demo status.
  }
}

function renderBillingStatus() {
  const statusEl = document.getElementById("billing-status");
  if (!statusEl) return;
  const status = getPremiumStatus();
  if (status.plan === "premium") {
    statusEl.innerHTML = `<strong>Premium active</strong><span>Expires ${new Date(status.premiumExpiresAt).toLocaleDateString()}</span>`;
  } else {
    statusEl.innerHTML = `<strong>Free plan</strong><span>Upgrade to unlock unlimited student tools.</span>`;
  }
}

function renderPremiumBadges() {
  const nav = document.querySelector(".nav-links");
  if (!nav || document.getElementById("premium-nav-item")) return;
  const item = document.createElement("li");
  item.id = "premium-nav-item";
  item.innerHTML = `<a href="premium.html">${isPremium() ? "Premium" : "Upgrade"}</a>`;
  nav.appendChild(item);
}

initBilling();
syncPremiumFromServer();
renderPremiumBadges();
