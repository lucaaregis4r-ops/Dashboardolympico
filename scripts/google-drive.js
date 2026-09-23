const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const CONFIG_ROOT = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "DashboardOlympico")
  : path.join(os.homedir(), ".config", "dashboard-olympico");
const DEFAULT_CLIENT_FILE = path.join(CONFIG_ROOT, "google-drive-client.json");
const DEFAULT_TOKEN_FILE = path.join(CONFIG_ROOT, "google-drive-token.json");
const DEFAULT_SETTINGS_FILE = path.join(CONFIG_ROOT, "google-drive-settings.json");

function normalizeText(value) {
  return String(value || "").trim();
}

function resolveConfigPath(value, fallback) {
  return path.resolve(normalizeText(value) || fallback);
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`${label} nao encontrado: ${filePath}`);
    }
    throw new Error(`${label} invalido em ${filePath}: ${error.message}`);
  }
}

async function writePrivateJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function parseClientCredentials(payload) {
  const config = payload?.installed || payload?.web || payload;
  const clientId = normalizeText(config?.client_id);
  const clientSecret = normalizeText(config?.client_secret);
  if (!clientId || !clientSecret) {
    throw new Error("O JSON OAuth precisa conter client_id e client_secret de um aplicativo para computador.");
  }
  return { clientId, clientSecret };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: options.signal || AbortSignal.timeout(120000),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const detail = payload?.error?.message || payload?.error_description || payload?.raw || response.statusText;
    throw new Error(`Google respondeu ${response.status}: ${detail}`);
  }
  return payload;
}

function openBrowser(url) {
  let child;
  if (process.platform === "win32") {
    // Nao use `cmd /c start`: o cmd interpreta os `&` da URL OAuth como
    // separadores de comando e abre um endereco incompleto.
    child = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
      detached: true,
      windowsHide: true,
      stdio: "ignore",
    });
  } else if (process.platform === "darwin") {
    child = spawn("open", [url], { detached: true, stdio: "ignore" });
  } else {
    child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  }
  child.unref();
}

function buildAuthorizationUrl(credentials, redirectUri, state) {
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return authUrl;
}

async function exchangeAuthorizationCode(credentials, code, redirectUri) {
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  return fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

async function authorizeGoogleDrive(options = {}) {
  const clientFile = resolveConfigPath(options.clientFile, DEFAULT_CLIENT_FILE);
  const tokenFile = resolveConfigPath(options.tokenFile, DEFAULT_TOKEN_FILE);
  const credentials = parseClientCredentials(await readJson(clientFile, "Credencial OAuth"));
  const state = crypto.randomBytes(24).toString("hex");
  const timeoutMs = Number(options.timeoutMs) || 300000;
  let callbackResolve;
  let callbackReject;
  const callback = new Promise((resolve, reject) => {
    callbackResolve = resolve;
    callbackReject = reject;
  });

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    if (requestUrl.pathname !== "/oauth2callback") {
      response.writeHead(404).end("Pagina nao encontrada.");
      return;
    }
    if (requestUrl.searchParams.get("state") !== state) {
      response.writeHead(400).end("Estado de autenticacao invalido.");
      callbackReject(new Error("O retorno OAuth nao corresponde a esta solicitacao."));
      return;
    }
    const error = requestUrl.searchParams.get("error");
    const code = requestUrl.searchParams.get("code");
    if (error || !code) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(`Autorizacao nao concluida: ${error || "codigo ausente"}`);
      callbackReject(new Error(`Autorizacao nao concluida: ${error || "codigo ausente"}`));
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<h1>Google Drive conectado</h1><p>Voce pode fechar esta janela e voltar ao terminal.</p>");
    callbackResolve(code);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const authUrl = buildAuthorizationUrl(credentials, redirectUri, state);

  console.log("Abrindo o Google para autorizar somente os arquivos criados pelo dashboard...");
  console.log(authUrl.toString());
  openBrowser(authUrl.toString());

  let timer;
  try {
    const code = await Promise.race([
      callback,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Tempo esgotado aguardando a autorizacao do Google.")), timeoutMs);
      }),
    ]);
    const tokens = await exchangeAuthorizationCode(credentials, code, redirectUri);
    const stored = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope || DRIVE_SCOPE,
      token_type: tokens.token_type || "Bearer",
      expiry_date: Date.now() + Number(tokens.expires_in || 3600) * 1000,
    };
    if (!stored.refresh_token) {
      throw new Error("O Google nao retornou refresh_token. Remova o acesso anterior do app e autorize novamente.");
    }
    await writePrivateJson(tokenFile, stored);
    console.log(`Autorizacao salva fora do projeto: ${tokenFile}`);
    return { clientFile, tokenFile };
  } finally {
    clearTimeout(timer);
    await new Promise((resolve) => server.close(resolve));
  }
}

async function getAccessToken(options = {}) {
  const clientFile = resolveConfigPath(options.clientFile, DEFAULT_CLIENT_FILE);
  const tokenFile = resolveConfigPath(options.tokenFile, DEFAULT_TOKEN_FILE);
  const credentials = parseClientCredentials(await readJson(clientFile, "Credencial OAuth"));
  const stored = await readJson(tokenFile, "Token do Google Drive");

  if (stored.access_token && Number(stored.expiry_date || 0) > Date.now() + 60000) {
    return { accessToken: stored.access_token, tokenFile };
  }
  if (!stored.refresh_token) {
    throw new Error("Token sem refresh_token. Rode `npm run drive:auth` novamente.");
  }

  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: stored.refresh_token,
    grant_type: "refresh_token",
  });
  const refreshed = await fetchJson("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const next = {
    ...stored,
    access_token: refreshed.access_token,
    scope: refreshed.scope || stored.scope,
    token_type: refreshed.token_type || stored.token_type || "Bearer",
    expiry_date: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
  };
  await writePrivateJson(tokenFile, next);
  return { accessToken: next.access_token, tokenFile };
}

async function ensureGoogleDriveAuthorization(options = {}) {
  const tokenFile = resolveConfigPath(options.tokenFile, DEFAULT_TOKEN_FILE);
  try {
    await fs.access(tokenFile);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    console.log("Primeiro acesso ao Drive: abrindo a autorizacao do Google...");
    await authorizeGoogleDrive(options);
  }
}

function escapeDriveQuery(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveJson(accessToken, url, options = {}) {
  return fetchJson(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
      ...(options.headers || {}),
    },
  });
}

async function findChild(accessToken, parentId, name, mimeType = "") {
  const clauses = [
    `'${escapeDriveQuery(parentId)}' in parents`,
    `name = '${escapeDriveQuery(name)}'`,
    "trashed = false",
  ];
  if (mimeType) clauses.push(`mimeType = '${escapeDriveQuery(mimeType)}'`);
  const url = new URL(`${DRIVE_API}/files`);
  url.searchParams.set("q", clauses.join(" and "));
  url.searchParams.set("spaces", "drive");
  url.searchParams.set("fields", "files(id,name,mimeType,webViewLink,size)");
  url.searchParams.set("pageSize", "10");
  const payload = await driveJson(accessToken, url);
  return payload.files?.[0] || null;
}

async function createFolder(accessToken, name, parentId = "") {
  const metadata = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) metadata.parents = [parentId];
  return driveJson(accessToken, `${DRIVE_API}/files?fields=id,name,mimeType,webViewLink`, {
    method: "POST",
    body: JSON.stringify(metadata),
  });
}

async function ensureFolder(accessToken, name, parentId = "") {
  if (parentId) {
    const existing = await findChild(accessToken, parentId, name, "application/vnd.google-apps.folder");
    if (existing) return existing;
  }
  return createFolder(accessToken, name, parentId);
}

async function uploadNewPdf(accessToken, filePath, parentId) {
  const fileName = path.basename(filePath);
  const content = await fs.readFile(filePath);
  const boundary = `dashboard-olympico-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: fileName, parents: [parentId] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  return fetchJson(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,size`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
}

async function updatePdf(accessToken, fileId, filePath) {
  const content = await fs.readFile(filePath);
  await fetchJson(`${DRIVE_UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/pdf" },
    body: content,
  });
  return driveJson(accessToken, `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,webViewLink,size`);
}

async function uploadReportDirectory(reportDirectory, options = {}) {
  const directory = path.resolve(reportDirectory);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const pdfs = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
  if (!pdfs.length) throw new Error(`Nenhum PDF encontrado em ${directory}`);

  await ensureGoogleDriveAuthorization(options);
  const { accessToken } = await getAccessToken(options);
  const settingsFile = resolveConfigPath(options.settingsFile, DEFAULT_SETTINGS_FILE);
  const settings = await fs.readFile(settingsFile, "utf8").then(JSON.parse).catch(() => ({}));
  let parentFolderId = normalizeText(options.parentFolderId || process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID);

  if (!parentFolderId) {
    if (settings.rootFolderId) {
      parentFolderId = settings.rootFolderId;
    } else {
      const root = await createFolder(accessToken, "Relatorios Olympico");
      parentFolderId = root.id;
      await writePrivateJson(settingsFile, { ...settings, rootFolderId: root.id });
    }
  }

  const folder = await ensureFolder(accessToken, path.basename(directory), parentFolderId);
  const files = [];
  for (const [index, filePath] of pdfs.entries()) {
    const fileName = path.basename(filePath);
    console.log(`Drive ${index + 1}/${pdfs.length}: ${fileName}`);
    const existing = await findChild(accessToken, folder.id, fileName, "application/pdf");
    const uploaded = existing
      ? await updatePdf(accessToken, existing.id, filePath)
      : await uploadNewPdf(accessToken, filePath, folder.id);
    files.push(uploaded);
  }

  const manifest = {
    uploadedAt: new Date().toISOString(),
    localDirectory: directory,
    folder,
    files,
    sharing: "private",
  };
  await fs.writeFile(path.join(directory, "_drive-upload.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

module.exports = {
  DEFAULT_CLIENT_FILE,
  DEFAULT_SETTINGS_FILE,
  DEFAULT_TOKEN_FILE,
  authorizeGoogleDrive,
  buildAuthorizationUrl,
  ensureGoogleDriveAuthorization,
  escapeDriveQuery,
  parseClientCredentials,
  uploadReportDirectory,
};
