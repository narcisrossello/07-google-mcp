import { google } from "googleapis";
import readline from "readline/promises";
import "dotenv/config";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

// const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const SCOPES = ["https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks"];
// const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function getAccessToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("Autoriza esta app visitando este URL:\n\n", authUrl);

  const code = await rl.question("\nPega aquí el código de autorización: ");
  rl.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n✅ Tokens generados:\n");
    console.log(tokens);
  } catch (err) {
    console.error("\n❌ Error al obtener tokens:\n", err);
  }
}

getAccessToken();
