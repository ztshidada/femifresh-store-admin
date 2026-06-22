const { read, write } = require("../db");

const defaultSettings = {
  business: {
    name: "FemiFresh",
    email: "femifresh02@gmail.com",
    phone: "0632180372",
    whatsapp: "0632180372",
    address: "South Africa",
    hours: "Monday to Saturday, 08:00 - 17:00"
  },
  bank: {
    bankName: "FNB",
    accountHolder: "Femi Fresh (PTY) LTD",
    accountType: "FNB Business Account",
    accountNumber: "63214749822",
    branchCode: "",
    proofEmail: "femifresh02@gmail.com",
    proofWhatsapp: "0632180372"
  },
  payment: {
    activeMethod: "manual",
    yocoEnabled: false,
    joiningFeeAmount: 100,
    manualInstructions: "Please make payment and send proof of payment to WhatsApp 0632180372. Use your order number or registered email as reference."
  },
  deliveryZones: [
    { id: "collection", name: "Collection", regions: ["All"], fee: 0, active: true },
    { id: "paxi", name: "Paxi", regions: ["South Africa"], fee: 60, active: true },
    { id: "courier", name: "Courier", regions: ["South Africa"], fee: 100, active: true }
  ],
  notificationTemplates: {
    unpaidOrderWhatsapp: "Hi {{name}}, your FemiFresh order {{orderNumber}} for {{total}} is awaiting payment. Please send proof of payment to WhatsApp 0632180372 using reference {{orderNumber}}.",
    joiningFeeWhatsapp: "Hi {{name}}, your FemiFresh affiliate account is awaiting the R100 joining fee. Please send proof of payment to WhatsApp 0632180372 using your registered email as reference.",
    fulfilledWhatsapp: "Hi {{name}}, your FemiFresh order {{orderNumber}} has been fulfilled. Tracking: {{trackingNumber}}"
  }
};

function deepMerge(base, extra) {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      out[key] = deepMerge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function getSettings() {
  return deepMerge(defaultSettings, read("settings", {}));
}

function saveSettings(patch) {
  const next = deepMerge(getSettings(), patch || {});
  write("settings", next);
  return next;
}

function publicPaymentSettings() {
  const s = getSettings();
  return {
    business: s.business,
    bank: s.bank,
    payment: s.payment
  };
}

function paymentInstructions(reference, amount, purpose = "order") {
  const s = getSettings();
  return {
    method: "manual",
    purpose,
    amount: Number(amount || 0),
    reference,
    bank: s.bank,
    instructions: s.payment.manualInstructions,
    whatsappUrl: `https://wa.me/27${String(s.bank.proofWhatsapp || s.business.whatsapp || "").replace(/\D/g, "").replace(/^27/, "")}?text=${encodeURIComponent(`FemiFresh proof of payment for ${reference}`)}`
  };
}

module.exports = { defaultSettings, getSettings, saveSettings, publicPaymentSettings, paymentInstructions };
