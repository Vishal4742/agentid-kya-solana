import dotenv from "dotenv";

dotenv.config();

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const HELIUS_WEBHOOK_AUTH = process.env.HELIUS_WEBHOOK_AUTH;
const PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF"; // The AgentID Program Address

if (!HELIUS_API_KEY || !WEBHOOK_URL || !HELIUS_WEBHOOK_AUTH) {
  console.error(
    "❌ Missing HELIUS_API_KEY, WEBHOOK_URL, or HELIUS_WEBHOOK_AUTH in .env"
  );
  process.exit(1);
}

const registerWebhook = async () => {
  try {
    console.log(`📡 Registering webhook for Program: ${PROGRAM_ID}`);
    console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);

    const response = await fetch(
      `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookURL: WEBHOOK_URL,
          transactionTypes: ["ANY"],
          accountAddresses: [PROGRAM_ID],
          webhookType: "enhanced", // enhanced webhooks provide parsed instruction logs and token transfers
          authHeader: HELIUS_WEBHOOK_AUTH,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Helius API Error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log(`✅ Successfully registered webhook!`);
    console.log(`   Webhook ID: ${data.webhookID}`);
  } catch (err) {
    console.error("❌ Failed to register webhook:", err);
  }
};

registerWebhook();
