// Prepares an EAS iOS build + TestFlight submission on GitHub Actions without any secret being
// committed or printed.
// - Writes the App Store Connect API key (GitHub secret ASC_API_KEY_P8) to a private temp file and
//   checks that it parses as a private key.
// - Validates the non-secret identifiers (GitHub repository variables) and copies them into
//   app.json / eas.json in the CI checkout only (never committed).
// Exits with a list of what is missing or malformed, naming variables but never echoing values.
import { createPrivateKey } from 'node:crypto';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const env = process.env;
const problems = [];
const need = (name, re, hint) => {
  const v = (env[name] ?? '').trim();
  if (!v) problems.push(`${name} is not set (${hint})`);
  else if (re && !re.test(v)) problems.push(`${name} does not look right (${hint})`);
  return v;
};

const token = need('EXPO_TOKEN', null, 'repository secret: Expo access token');
const projectId = need('EAS_PROJECT_ID', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'repository variable: Expo project ID, a UUID');
const owner = (env.EXPO_OWNER ?? '').trim();
const keyId = need('ASC_KEY_ID', /^[A-Z0-9]{10}$/, 'repository variable: 10-character App Store Connect key ID');
const issuerId = need('ASC_ISSUER_ID', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'repository variable: issuer ID, a UUID');
const teamId = need('APPLE_TEAM_ID', /^[A-Z0-9]{10}$/, 'repository variable: 10-character Apple Team ID');
const ascAppId = need('ASC_APP_ID', /^\d{6,12}$/, 'repository variable: the app’s Apple ID number from App Store Connect');
const rawKey = need('ASC_API_KEY_P8', null, 'repository secret: the full text of the .p8 key file');
void token;

let keyPath = null;
if (rawKey) {
  // Accept the key pasted with lost or Windows line breaks; rebuild standard PEM lines.
  const body = rawKey.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const pem = `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join('\n') ?? ''}\n-----END PRIVATE KEY-----\n`;
  try {
    createPrivateKey(pem);
    keyPath = join(env.RUNNER_TEMP ?? '/tmp', `AuthKey_${keyId || 'unknown'}.p8`);
    writeFileSync(keyPath, pem, { mode: 0o600 });
    chmodSync(keyPath, 0o600);
  } catch {
    problems.push('ASC_API_KEY_P8 is not a valid private key (paste the whole .p8 file, including the BEGIN and END lines)');
  }
}

if (problems.length) {
  console.error(`EAS setup is incomplete:\n- ${problems.join('\n- ')}\nSee docs/BUILD_AND_RUN.md → “TestFlight setup”.`);
  process.exit(1);
}

const app = JSON.parse(readFileSync('app.json', 'utf8'));
if (app.expo.ios.bundleIdentifier !== 'com.badgolfer.app') {
  console.error(`Refusing to build: bundle identifier is ${app.expo.ios.bundleIdentifier}, not the owner-approved com.badgolfer.app.`);
  process.exit(1);
}
app.expo.extra = { ...(app.expo.extra ?? {}), eas: { ...(app.expo.extra?.eas ?? {}), projectId } };
if (owner) app.expo.owner = owner;
writeFileSync('app.json', `${JSON.stringify(app, null, 2)}\n`);

const eas = JSON.parse(readFileSync('eas.json', 'utf8'));
eas.submit.production.ios = { ascAppId, appleTeamId: teamId, ascApiKeyPath: keyPath, ascApiKeyId: keyId, ascApiKeyIssuerId: issuerId };
writeFileSync('eas.json', `${JSON.stringify(eas, null, 2)}\n`);

// Expose the key path to later steps for EAS's credential generation (EXPO_ASC_API_KEY_PATH).
if (env.GITHUB_ENV) writeFileSync(env.GITHUB_ENV, `EXPO_ASC_API_KEY_PATH=${keyPath}\n`, { flag: 'a' });
console.log('EAS setup looks complete: key file written privately; project, team and app identifiers set for this run only.');
