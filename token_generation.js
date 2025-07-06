import { google } from "googleapis";
import readline from "readline/promises";
import "dotenv/config";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

const SCOPES = ["https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks"];

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

  console.log("Authorize this app by visiting this URL:\n\n", authUrl);

  const code = await rl.question("\nPaste the authorization code here: ");
  rl.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n✅ Tokens generated:\n");
    console.log(tokens);
  } catch (err) {
    console.error("\n❌ Error obtaining tokens:\n", err);
  }
}

getAccessToken();
