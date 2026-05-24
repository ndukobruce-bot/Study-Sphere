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

function canUsePremiumFeature(type, count) {
  if (isPremium()) return true;
  return count < (PREMIUM_LIMITS[type] || 0);
}

function showUpgradePrompt(featureName) {
  const prompt = document.createElement("div");
  prompt.className = "premium-lock";
  prompt.innerHTML = `
    <strong>${featureName} is a Premium feature</strong>
    <span>Upgrade to StudySphere Premium for $1.99/month to unlock this and more.</span>
    <a class="btn-primary" href="premium.html">View Premium</a>
  `;
  document.body.appendChild(prompt);
  setTimeout(() => prompt.remove(), 5200);
}

function initBilling() {
  const statusEl = document.getElementById("billing-status");
  if (!statusEl) return;

  renderBillingStatus();
  document.getElementById("simulate-upgrade-btn").onclick = function() {
    if (!document.getElementById("billing-consent").checked) {
      statusEl.textContent = "Please confirm the simulated checkout notice first.";
      return;
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setMonth(expires.getMonth() + 1);
    setPremiumStatus({
      plan: "premium",
      price: 1.99,
      currency: "USD",
      paymentStatus: "simulated_paid",
      premiumStartedAt: now.toISOString(),
      premiumExpiresAt: expires.toISOString()
    });
    renderBillingStatus();
  };

  document.getElementById("cancel-premium-btn").onclick = function() {
    setPremiumStatus({
      plan: "free",
      paymentStatus: "cancelled",
      cancelledAt: new Date().toISOString()
    });
    renderBillingStatus();
  };
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
renderPremiumBadges();
