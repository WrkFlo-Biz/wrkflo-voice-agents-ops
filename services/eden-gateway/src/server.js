import express from "express";
import { google } from "googleapis";
import { TableClient } from "@azure/data-tables";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 8080);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || "";
const SESSION_TABLE_NAME = process.env.SESSION_TABLE_NAME || "liveDemoSessions";
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const HANDOFF_AGENT_ID = process.env.HANDOFF_AGENT_ID || "agent_9601kjenmpbwewntb483he79nfvr";
const HANDOFF_AGENT_PHONE_NUMBER_ID =
  process.env.HANDOFF_AGENT_PHONE_NUMBER_ID || "phnum_4601kja8mj5ve8ea4pn9n9fx2znq";
const HANDOFF_CALL_RECORDING_ENABLED =
  String(process.env.HANDOFF_CALL_RECORDING_ENABLED || "true").toLowerCase() === "true";
const HANDOFF_DEDUPE_WINDOW_MS = Number(process.env.HANDOFF_DEDUPE_WINDOW_MS || 180000);
const HANDOFF_DIAL_MODE = String(process.env.HANDOFF_DIAL_MODE || "caller").toLowerCase();
const HANDOFF_HUMAN_NUMBER = process.env.HANDOFF_HUMAN_NUMBER || "+17632224106";
const HANDOFF_SINGLE_LEG_TEST_MODE =
  String(process.env.HANDOFF_SINGLE_LEG_TEST_MODE || "false").toLowerCase() === "true";
const LIVE_DEMO_REQUIRE_EXPLICIT_START =
  String(process.env.LIVE_DEMO_REQUIRE_EXPLICIT_START || "true").toLowerCase() === "true";
const LIVE_DEMO_START_ASYNC =
  String(process.env.LIVE_DEMO_START_ASYNC || "true").toLowerCase() === "true";
const LIVE_DEMO_START_TIMEOUT_MS = Number(process.env.LIVE_DEMO_START_TIMEOUT_MS || 4000);
const LIVE_DEMO_DOC_OP_TIMEOUT_MS = Number(process.env.LIVE_DEMO_DOC_OP_TIMEOUT_MS || 5000);
const WRKFLO_SEARCH_ENDPOINT = process.env.WRKFLO_SEARCH_ENDPOINT || "";
const WRKFLO_SEARCH_API_KEY = process.env.WRKFLO_SEARCH_API_KEY || "";
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || "";
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "";
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
const WRKFLO_ORCHESTRATE_TIMEOUT_MS = Number(process.env.WRKFLO_ORCHESTRATE_TIMEOUT_MS || 12000);

const WRKFLO_TOOL_DEFINITIONS = [
  {
    name: "wrkflo_search",
    description:
      "Search or answer current-information requests through the WrkFlo gateway. Use once per real current-info request. Do not retry the same query automatically.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The user request or search query." },
        context: { type: "string", description: "Brief conversation context, if useful." },
        maxResults: { type: "integer", minimum: 1, maximum: 8, default: 5 }
      },
      required: ["query"]
    }
  },
  {
    name: "wrkflo_orchestrate",
    description:
      "Route complex WrkFlo requests through the WrkFlo app and optional Azure Foundry/Azure OpenAI model. Use for multi-step planning, tool selection, and non-search business workflow help.",
    inputSchema: {
      type: "object",
      properties: {
        request: { type: "string", description: "The user request to route or answer." },
        context: { type: "string", description: "Short conversation context." },
        conversationId: { type: "string", description: "ElevenLabs conversation ID, if available." }
      },
      required: ["request"]
    }
  },
  {
    name: "wrkflo_notes_finalize",
    description:
      "Finalize WrkFlo call notes and optionally email a user copy. This wraps the existing notes finalization endpoint with the same auth and recovery behavior.",
    inputSchema: {
      type: "object",
      properties: {
        conversationId: { type: "string" },
        callerEmail: { type: "string" },
        callerName: { type: "string" },
        summary: { type: "string" },
        sendUserCopy: { type: "boolean", default: false },
        cc: { type: "string" }
      },
      required: ["conversationId"]
    }
  }
];

const memorySessions = new Map();
const recentHandoffsByNumber = new Map();
const sessionTable = initSessionTableClient();

function initSessionTableClient() {
  if (!AZURE_STORAGE_CONNECTION_STRING) return null;
  try {
    const client = TableClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING, SESSION_TABLE_NAME);
    client.createTable().catch(() => {
      return;
    });
    return client;
  } catch (err) {
    console.error("session_table_init_error", err?.message || String(err));
    return null;
  }
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-webhook-token");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).send();
  return next();
});

function requireAuth(req, res, next) {
  if (!WEBHOOK_TOKEN) return next();
  const provided = req.header("x-webhook-token") || "";
  if (provided !== WEBHOOK_TOKEN) return res.status(401).json({ ok: false, error: "unauthorized" });
  return next();
}

function getOauthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "";
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN");
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function docsClient(auth) {
  return google.docs({ version: "v1", auth });
}

function driveClient(auth) {
  return google.drive({ version: "v3", auth });
}

function gmailClient(auth) {
  return google.gmail({ version: "v1", auth });
}

function normalizeEmail(v) {
  let email = String(v || "").trim().toLowerCase();
  if (!email) return "";

  const angleMatch = email.match(/<([^>]+)>/);
  if (angleMatch?.[1]) email = angleMatch[1];

  email = email
    .replace(/^mailto:/, "")
    .replace(/\(at\)/g, "@")
    .replace(/\bat\b/g, "@")
    .replace(/\(dot\)/g, ".")
    .replace(/\bdot\b/g, ".")
    .replace(/\bunderscore\b/g, "_")
    .replace(/\bdash\b/g, "-")
    .replace(/\s+/g, "")
    .replace(/[;,]+$/g, "");

  return email;
}

function isLikelyEmail(v) {
  const email = normalizeEmail(v);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(v) {
  let phone = String(v || "").trim().toLowerCase();
  if (!phone) return "";

  const words = {
    zero: "0",
    oh: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9"
  };

  phone = phone.replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g, (m) => words[m] || m);
  phone = phone.replace(/[^+\d]/g, "");
  phone = phone.replace(/(?!^)\+/g, "");

  if (!phone) return "";
  if (phone.startsWith("+")) return phone;
  if (phone.length === 10) return `+1${phone}`;
  if (phone.length === 11 && phone.startsWith("1")) return `+${phone}`;
  return `+${phone}`;
}

function isLikelyE164(v) {
  return /^\+\d{10,15}$/.test(String(v || ""));
}

function isLikelyDialableCallback(v) {
  const e164 = String(v || "").trim();
  if (!isLikelyE164(e164)) return false;

  const digits = e164.replace(/\D/g, "");
  if (!digits) return false;

  // Reject placeholders like 0000000000 or a single repeated digit.
  if (/^(\d)\1+$/.test(digits)) return false;
  if (/^1?0+$/.test(digits)) return false;
  if (/^1?1234567890$/.test(digits)) return false;

  // Apply NANP sanity checks for +1 numbers.
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4);
    const exchange = digits.slice(4, 7);
    if (!/^[2-9]\d{2}$/.test(area)) return false;
    if (!/^[2-9]\d{2}$/.test(exchange)) return false;
  }

  return true;
}

function strip(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  const normalized = String(v || "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

function isoNow() {
  return new Date().toISOString();
}

function jsonText(value) {
  return JSON.stringify(value, null, 2);
}

function safeInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function textExcerpt(value, maxChars = 1200) {
  const text = strip(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

async function callWrkfloSearchProvider({ query, context, maxResults }) {
  if (!WRKFLO_SEARCH_ENDPOINT) return null;

  const response = await postJsonWithTimeout(
    WRKFLO_SEARCH_ENDPOINT,
    { query, context, maxResults },
    WRKFLO_SEARCH_API_KEY ? { Authorization: `Bearer ${WRKFLO_SEARCH_API_KEY}` } : {},
    WRKFLO_ORCHESTRATE_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`wrkflo_search_provider_failed status=${response.status} body=${textExcerpt(response.text, 300)}`);
  }

  return response.json || { ok: true, text: response.text };
}

async function callDuckDuckGoInstantAnswer({ query }) {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("skip_disambig", "1");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json) return null;

    const related = Array.isArray(json.RelatedTopics)
      ? json.RelatedTopics.flatMap((item) => (Array.isArray(item?.Topics) ? item.Topics : [item]))
          .filter((item) => item?.Text)
          .slice(0, 5)
          .map((item) => ({ title: item.Text, url: item.FirstURL || "" }))
      : [];

    const answer = strip(json.AbstractText || json.Answer || "");
    if (!answer && related.length === 0) return null;
    return {
      ok: true,
      provider: "duckduckgo_instant_answer",
      answer,
      results: related,
      agentMessage: answer || "I found a few related references, but not a definitive current answer."
    };
  } finally {
    clearTimeout(timer);
  }
}

async function wrkfloSearch({ query, context = "", maxResults = 5 }) {
  const cleanQuery = strip(query);
  if (!cleanQuery) {
    return {
      ok: false,
      error: "missing_query",
      agentMessage: "I need a search query before I can look that up."
    };
  }

  try {
    const providerResult = await callWrkfloSearchProvider({
      query: cleanQuery,
      context: strip(context),
      maxResults: safeInt(maxResults, 5, 1, 8)
    });
    if (providerResult) {
      return {
        ok: providerResult.ok !== false,
        provider: providerResult.provider || "wrkflo_search_provider",
        answer: providerResult.answer || providerResult.agentMessage || providerResult.text || "",
        results: providerResult.results || [],
        agentMessage:
          providerResult.agentMessage ||
          providerResult.answer ||
          "I found information through the WrkFlo search gateway."
      };
    }
  } catch (err) {
    console.error("wrkflo_search_provider_error", String(err?.message || err));
  }

  const instant = await callDuckDuckGoInstantAnswer({ query: cleanQuery });
  if (instant) return instant;

  return {
    ok: false,
    error: "search_provider_unavailable",
    provider: WRKFLO_SEARCH_ENDPOINT ? "wrkflo_search_provider" : "none_configured",
    agentMessage:
      "Current web search is not available from the WrkFlo gateway yet. I can still help from existing WrkFlo knowledge or take a note for follow-up."
  };
}

async function callAzureOpenAI({ system, user }) {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) return null;

  const endpoint = AZURE_OPENAI_ENDPOINT.replace(/\/+$/g, "");
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(
    AZURE_OPENAI_DEPLOYMENT
  )}/chat/completions?api-version=${encodeURIComponent(AZURE_OPENAI_API_VERSION)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WRKFLO_ORCHESTRATE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": AZURE_OPENAI_API_KEY
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.2,
        max_tokens: 300
      }),
      signal: controller.signal
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!response.ok) {
      throw new Error(`azure_openai_failed status=${response.status} body=${textExcerpt(text, 300)}`);
    }
    return strip(json?.choices?.[0]?.message?.content || "");
  } finally {
    clearTimeout(timer);
  }
}

async function wrkfloOrchestrate({ request, context = "", conversationId = "" }) {
  const cleanRequest = strip(request);
  if (!cleanRequest) {
    return { ok: false, error: "missing_request", agentMessage: "I need the request first." };
  }

  const system = [
    "You are the WrkFlo voice tool gateway.",
    "Return concise voice-safe guidance.",
    "Do not claim that external actions completed unless the tool result says they did.",
    "Prefer one next action and avoid markdown."
  ].join(" ");

  const user = [
    `Request: ${cleanRequest}`,
    context ? `Context: ${strip(context)}` : "",
    conversationId ? `Conversation ID: ${strip(conversationId)}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const answer = await callAzureOpenAI({ system, user });
    if (answer) {
      return { ok: true, provider: "azure_openai", answer, agentMessage: answer };
    }
  } catch (err) {
    console.error("wrkflo_orchestrate_azure_error", String(err?.message || err));
  }

  return {
    ok: true,
    provider: "wrkflo_rule_router",
    answer:
      "I can help route that through WrkFlo. For live search, scheduling, handoff, or notes, use the matching WrkFlo tool. For anything else, collect one clear next step and offer follow-up.",
    agentMessage:
      "I can route that through WrkFlo. Tell me the main next step: search, schedule, notes, handoff, or workflow planning."
  };
}

async function executeWrkfloTool(name, args = {}) {
  if (name === "wrkflo_search") return wrkfloSearch(args);
  if (name === "wrkflo_orchestrate") return wrkfloOrchestrate(args);
  if (name === "wrkflo_notes_finalize") {
    const conversationId = strip(args.conversationId || args.conversation_id || "");
    if (!conversationId) {
      return {
        ok: false,
        error: "missing_conversation_id",
        agentMessage: "I need the conversation ID before I can finalize notes."
      };
    }
    return finalizeWorkspaceNotes(args);
  }
  return { ok: false, error: "unknown_tool", agentMessage: "That WrkFlo tool is not available." };
}

function mcpToolResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: jsonText(result) }],
      isError: result?.ok === false
    }
  };
}

function toMs(v) {
  const n = Date.parse(String(v || ""));
  return Number.isFinite(n) ? n : 0;
}

function getRecentHandoffByNumber(callbackNumber) {
  if (!callbackNumber) return null;
  const hit = recentHandoffsByNumber.get(callbackNumber);
  if (!hit) return null;
  const ageMs = Date.now() - Number(hit.atMs || 0);
  if (ageMs > HANDOFF_DEDUPE_WINDOW_MS) {
    recentHandoffsByNumber.delete(callbackNumber);
    return null;
  }
  return hit;
}

function markRecentHandoffByNumber(callbackNumber, payload) {
  if (!callbackNumber) return;
  recentHandoffsByNumber.set(callbackNumber, {
    atMs: Date.now(),
    ...payload
  });
}

function getSessionRef(conversationId) {
  const id = strip(conversationId);
  if (!id) return null;
  return { partitionKey: "session", rowKey: id };
}

async function loadSession(conversationId) {
  const ref = getSessionRef(conversationId);
  if (!ref) return null;
  if (sessionTable) {
    try {
      return await sessionTable.getEntity(ref.partitionKey, ref.rowKey);
    } catch (err) {
      const code = Number(err?.statusCode || 0);
      if (code === 404) return null;
      throw err;
    }
  }
  return memorySessions.get(ref.rowKey) || null;
}

async function saveSession(conversationId, patch) {
  const ref = getSessionRef(conversationId);
  if (!ref) return false;
  const existing = await loadSession(conversationId);
  const entity = {
    partitionKey: ref.partitionKey,
    rowKey: ref.rowKey,
    ...existing,
    ...patch,
    updatedAt: isoNow()
  };

  if (sessionTable) {
    await sessionTable.upsertEntity(entity, "Replace");
    return true;
  }

  memorySessions.set(ref.rowKey, entity);
  return true;
}

async function createDoc({ title, intro }) {
  const auth = getOauthClient();
  const docs = docsClient(auth);
  const drive = driveClient(auth);

  const created = await docs.documents.create({ requestBody: { title } });
  const docId = created.data.documentId;
  if (!docId) throw new Error("Failed to create doc");

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: `${intro}\n\n`
          }
        }
      ]
    }
  });

  const ownerEmail = normalizeEmail(
    process.env.WORKSPACE_OWNER_EMAIL || "wrkflo.biz@gmail.com"
  );
  if (ownerEmail) {
    try {
      await drive.permissions.create({
        fileId: docId,
        requestBody: { type: "user", role: "writer", emailAddress: ownerEmail },
        sendNotificationEmail: false
      });
    } catch (err) {
      // Do not fail the conversation flow if doc sharing fails.
      console.warn(`drive_share_warning owner=${ownerEmail} error=${String(err?.message || err)}`);
    }
  }

  return { docId, docUrl: `https://docs.google.com/document/d/${docId}/edit` };
}

async function appendDocText({ docId, text }) {
  const auth = getOauthClient();
  const docs = docsClient(auth);

  const current = await docs.documents.get({ documentId: docId });
  const content = current.data.body?.content || [];
  const endIndex = content.length > 0 ? (content[content.length - 1].endIndex || 1) : 1;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: Math.max(1, endIndex - 1) },
            text: `${text}\n`
          }
        }
      ]
    }
  });
}

function toBase64Url(raw) {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sendEmail({ to, cc, subject, bodyText }) {
  const auth = getOauthClient();
  const gmail = gmailClient(auth);
  const from = normalizeEmail(
    process.env.GMAIL_FROM_EMAIL || process.env.WORKSPACE_OWNER_EMAIL || "wrkflo.biz@gmail.com"
  );

  const msg = [
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : "",
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    bodyText
  ]
    .filter(Boolean)
    .join("\r\n");

  await gmail.users.messages.send({ userId: "me", requestBody: { raw: toBase64Url(msg) } });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(label || "timeout")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendEmailWithRetry(params, { retries = 1, timeoutMs = 12000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await withTimeout(sendEmail(params), timeoutMs, "gmail_send_timeout");
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await wait(400 * (attempt + 1));
    }
  }
  throw lastErr;
}

async function postJsonWithTimeout(url, body, headers = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const text = await resp.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return { ok: resp.ok, status: resp.status, text, json };
  } finally {
    clearTimeout(timer);
  }
}

async function triggerWidgetHandoffCall({
  callbackNumber,
  callerName,
  callerEmail,
  sourceConversationId,
  reason
}) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  const forceSingleLeg = HANDOFF_SINGLE_LEG_TEST_MODE && callbackNumber === HANDOFF_HUMAN_NUMBER;
  const dialMode = forceSingleLeg ? "human_single_leg_test" : HANDOFF_DIAL_MODE === "human" ? "human" : "caller";
  const toNumber = forceSingleLeg || dialMode === "human" ? HANDOFF_HUMAN_NUMBER : callbackNumber;

  const payload = {
    agent_id: HANDOFF_AGENT_ID,
    agent_phone_number_id: HANDOFF_AGENT_PHONE_NUMBER_ID,
    to_number: toNumber,
    call_recording_enabled: HANDOFF_CALL_RECORDING_ENABLED,
    conversation_initiation_client_data: {
      dynamic_variables: {
        handoff_source: "widget",
        handoff_reason: reason || "User requested live human transfer from widget",
        handoff_name: callerName || "",
        handoff_email: callerEmail || "",
        handoff_source_conversation_id: sourceConversationId || "",
        handoff_human_number: HANDOFF_HUMAN_NUMBER,
        handoff_caller_number: callbackNumber || "",
        handoff_dial_mode: dialMode,
        handoff_dialed_number: toNumber || "",
        handoff_auto_transfer: "true",
        handoff_trigger_phrase: "Transfer me to a live specialist now.",
        handoff_self_transfer: String((callbackNumber || "") === (HANDOFF_HUMAN_NUMBER || "")),
        handoff_single_leg_test: String(forceSingleLeg),
        handoff_context_summary: strip(
          `source=widget caller=${callbackNumber || ""} human=${HANDOFF_HUMAN_NUMBER} reason=${reason || "live human transfer"}`
        )
      }
    }
  };

  const response = await postJsonWithTimeout(
    "https://api.us.elevenlabs.io/v1/convai/twilio/outbound-call",
    payload,
    { "xi-api-key": ELEVENLABS_API_KEY },
    12000
  );

  const outboundMessage = strip(
    response?.json?.message ||
      response?.json?.error?.reason ||
      response?.json?.error ||
      response?.text ||
      ""
  );
  const explicitFailure = response?.json?.success === false;
  if (!response.ok || explicitFailure) {
    throw new Error(`handoff_outbound_failed status=${response.status} body=${outboundMessage}`);
  }

  return {
    conversationId:
      response?.json?.conversation_id ||
      response?.json?.conversationId ||
      response?.json?.conversation?.id ||
      null,
    callSid:
      response?.json?.callSid ||
      response?.json?.call_sid ||
      response?.json?.twilio_call_sid ||
      null
  };
}

function classifyWidgetHandoffError(err) {
  const raw = strip(err?.message || err || "");
  const lower = raw.toLowerCase();

  if (lower.includes("unverified") && lower.includes("trial accounts")) {
    return {
      code: "handoff_trial_unverified_number",
      retryable: false,
      needsVerifiedNumber: true,
      agentMessage:
        "I can transfer you live, but this callback number cannot be dialed right now. Please share a different reachable number."
    };
  }

  if (lower.includes("abort") || lower.includes("timeout")) {
    return {
      code: "handoff_timeout",
      retryable: true,
      needsVerifiedNumber: false,
      agentMessage: "I hit a transfer delay. Please share your callback number again and I will retry now."
    };
  }

  return {
    code: "handoff_request_failed",
    retryable: true,
    needsVerifiedNumber: false,
    agentMessage: "I hit a transfer issue. Please share your callback number again and I will retry now."
  };
}

function classifyWorkspaceError(err) {
  const raw = strip(err?.message || err || "");
  const lower = raw.toLowerCase();

  if (lower.includes("insufficient permission")) {
    return {
      code: "workspace_insufficient_permission",
      retryable: false,
      agentMessage:
        "Live notes are not available right now due to workspace permissions. I can continue the call without live notes."
    };
  }

  if (lower.includes("invalid_grant") || lower.includes("unauthorized")) {
    return {
      code: "workspace_oauth_error",
      retryable: false,
      agentMessage:
        "Live notes are unavailable due to authentication settings. I can continue the call without live notes."
    };
  }

  if (lower.includes("abort") || lower.includes("timeout")) {
    return {
      code: "workspace_timeout",
      retryable: true,
      agentMessage: "Live notes timed out. I can continue the call and keep notes manually."
    };
  }

  return {
    code: "workspace_request_failed",
    retryable: true,
    agentMessage: "Live notes are temporarily unavailable. I can continue the call without notes."
  };
}

function hasExplicitLiveDemoStartRequest(body) {
  const directFlags = [
    body?.liveNotesRequested,
    body?.live_notes_requested,
    body?.startConfirmed,
    body?.start_confirmed,
    body?.explicitStart,
    body?.explicit_start,
    body?.enableLiveNotes,
    body?.enable_live_notes,
    body?.startNow,
    body?.start_now
  ];
  if (directFlags.some((v) => toBool(v))) return true;

  const hint = strip(
    body?.reason ||
      body?.startReason ||
      body?.intent ||
      body?.request ||
      body?.userRequest ||
      body?.noteIntent ||
      ""
  ).toLowerCase();

  if (!hint) return false;
  const explicitPatterns = [
    /live notes?/,
    /start notes?/,
    /take notes?/,
    /record notes?/,
    /live demo notes?/,
    /document (this|the) call/,
    /transcrib/
  ];
  return explicitPatterns.some((pattern) => pattern.test(hint));
}

async function resolveDocId({ docId, conversationId }) {
  const cleanDocId = strip(docId);
  if (cleanDocId) return { docId: cleanDocId, session: null };

  const cleanConversationId = strip(conversationId);
  if (!cleanConversationId) return { docId: "", session: null };

  const session = await loadSession(cleanConversationId);
  return { docId: strip(session?.docId || ""), session };
}

async function findExistingRecentHandoff({ callbackNumber, sourceConversationId }) {
  const byNumber = getRecentHandoffByNumber(callbackNumber);
  if (byNumber) {
    return {
      callbackNumber,
      handoffConversationId: byNumber.handoffConversationId || null,
      handoffCallSid: byNumber.handoffCallSid || null
    };
  }

  const cid = strip(sourceConversationId);
  if (!cid) return null;
  const s = await loadSession(cid);
  if (!s) return null;
  const sameNumber = strip(s.handoffCallbackNumber || "") === strip(callbackNumber || "");
  const ageMs = Date.now() - toMs(s.handoffRequestedAt);
  if (!sameNumber || ageMs > HANDOFF_DEDUPE_WINDOW_MS) return null;

  return {
    callbackNumber,
    handoffConversationId: strip(s.handoffConversationId || "") || null,
    handoffCallSid: strip(s.handoffCallSid || "") || null
  };
}

app.get("/health", async (req, res) => {
  let sessionStore = "memory";
  let sessionStoreOk = true;
  if (sessionTable) {
    sessionStore = "azure-table";
    try {
      const iter = sessionTable.listEntities({ queryOptions: { top: 1 } });
      await iter.next();
      sessionStoreOk = true;
    } catch (err) {
      sessionStoreOk = false;
    }
  }

  return res.json({
    ok: true,
    service: "workspace-google-webhooks",
    date: isoNow(),
    sessionStore,
    sessionStoreOk,
    handoffEnabled: Boolean(ELEVENLABS_API_KEY && HANDOFF_AGENT_ID && HANDOFF_AGENT_PHONE_NUMBER_ID)
  });
});

app.post("/widget-human-handoff", requireAuth, async (req, res) => {
  try {
    const callerName = strip(req.body?.callerName || req.body?.full_name || req.body?.name || "");
    const callerEmail = normalizeEmail(req.body?.callerEmail || req.body?.email || "");
    const callbackNumber = normalizePhone(
      req.body?.callbackNumber || req.body?.callback_number || req.body?.phone || req.body?.phone_number || ""
    );
    const reason = strip(req.body?.reason || req.body?.interest_summary || "User requested live human transfer from widget");
    const sourceConversationId = strip(req.body?.conversationId || req.body?.conversation_id || "");

    if (!callbackNumber || !isLikelyDialableCallback(callbackNumber)) {
      // Return a non-error response so the agent can ask for digits again
      // without creating a hard tool-failure delay.
      return res.json({
        ok: false,
        queued: false,
        needsCallbackNumber: true,
        error: "Valid callbackNumber/phone_number is required",
        agentMessage: "I need your callback number in digits, including area code."
      });
    }

    const isSelfTransfer = callbackNumber === HANDOFF_HUMAN_NUMBER;
    const bypassSelfTransferShortCircuit = isSelfTransfer && HANDOFF_SINGLE_LEG_TEST_MODE;
    if (isSelfTransfer && !bypassSelfTransferShortCircuit) {
      if (sourceConversationId) {
        await saveSession(sourceConversationId, {
          conversationId: sourceConversationId,
          handoffRequestedAt: isoNow(),
          handoffRequestedBy: "widget",
          handoffCallbackNumber: callbackNumber,
          handoffCallerName: callerName,
          handoffCallerEmail: callerEmail,
          handoffReason: reason,
          handoffSelfTransfer: true
        });
      }
      return res.json({
        ok: true,
        queued: false,
        selfTransfer: true,
        callbackNumber,
        handoffConversationId: null,
        handoffCallSid: null,
        agentMessage:
          "You are already connected on the live specialist number, so no second transfer call is needed."
      });
    }

    const existing = await findExistingRecentHandoff({
      callbackNumber,
      sourceConversationId
    });
    if (existing) {
      return res.json({
        ok: true,
        queued: false,
        alreadyQueued: true,
        callbackNumber: existing.callbackNumber,
        handoffConversationId: existing.handoffConversationId,
        handoffCallSid: existing.handoffCallSid,
        agentMessage: "Please wait a moment while I transfer you over."
      });
    }

    const outbound = await triggerWidgetHandoffCall({
      callbackNumber,
      callerName,
      callerEmail,
      sourceConversationId,
      reason
    });

    if (sourceConversationId) {
      await saveSession(sourceConversationId, {
        conversationId: sourceConversationId,
        handoffRequestedAt: isoNow(),
        handoffRequestedBy: "widget",
        handoffCallbackNumber: callbackNumber,
        handoffCallerName: callerName,
        handoffCallerEmail: callerEmail,
        handoffReason: reason,
        handoffConversationId: outbound.conversationId || null,
        handoffCallSid: outbound.callSid || null
      });
    }
    markRecentHandoffByNumber(callbackNumber, {
      handoffConversationId: outbound.conversationId || null,
      handoffCallSid: outbound.callSid || null
    });

    return res.json({
      ok: true,
      queued: true,
      callbackNumber,
      handoffConversationId: outbound.conversationId,
      handoffCallSid: outbound.callSid,
      agentMessage: "Please wait a moment while I transfer you over."
    });
  } catch (err) {
    const classified = classifyWidgetHandoffError(err);
    console.error("widget_handoff_error", { code: classified.code, error: String(err?.message || err) });
    return res.json({
      ok: false,
      queued: false,
      error: classified.code,
      retryable: classified.retryable,
      needsVerifiedNumber: classified.needsVerifiedNumber,
      agentMessage: classified.agentMessage
    });
  }
});

app.post("/workspace-live-demo/start", requireAuth, async (req, res) => {
  try {
    const callerName = strip(req.body?.callerName || req.body?.full_name || req.body?.name || "Unknown Caller");
    const callerEmail = normalizeEmail(req.body?.callerEmail || req.body?.email || "");
    const phone = strip(req.body?.phone || req.body?.phone_number || "");
    const callbackNumber = normalizePhone(
      req.body?.callbackNumber || req.body?.callback_number || req.body?.phone || req.body?.phone_number || ""
    );
    const company = strip(req.body?.company || "");
    const timezone = strip(req.body?.timezone || "");
    const liveHandoffRequested = toBool(req.body?.liveHandoffRequested || req.body?.live_handoff_requested || false);
    const handoffReason = strip(req.body?.reason || req.body?.handoffReason || "");
    const conversationId = strip(req.body?.conversationId || req.body?.conversation_id || "");
    const explicitLiveNotesRequest = hasExplicitLiveDemoStartRequest(req.body);

    if (LIVE_DEMO_REQUIRE_EXPLICIT_START && !explicitLiveNotesRequest) {
      if (conversationId) {
        await saveSession(conversationId, {
          conversationId,
          status: "live_notes_blocked",
          callerName,
          callerEmail,
          phone,
          company,
          timezone,
          liveNotesBlockedAt: isoNow(),
          liveNotesBlockReason: "explicit_live_notes_request_required"
        });
      }
      return res.json({
        ok: false,
        started: false,
        blocked: true,
        shouldStartLiveNotes: false,
        error: "explicit_live_notes_request_required",
        agentMessage:
          "Live notes are off unless the caller explicitly asks for them. Continue the conversation normally."
      });
    }

    const title = `Wrk.Flo Live Demo - ${callerName} - ${new Date().toISOString().slice(0, 10)}`;
    const intro = [
      "Wrk.Flo Live Demo Notes",
      `Conversation ID: ${conversationId || "n/a"}`,
      `Caller: ${callerName}`,
      `Email: ${callerEmail || "n/a"}`,
      `Phone: ${phone || "n/a"}`,
      `Company: ${company || "n/a"}`,
      `Timezone: ${timezone || "n/a"}`,
      `Started: ${isoNow()}`,
      "",
      "Transcript / Notes:"
    ].join("\n");

    if (LIVE_DEMO_START_ASYNC) {
      if (conversationId) {
        await saveSession(conversationId, {
          conversationId,
          status: "starting",
          callerName,
          callerEmail,
          phone,
          company,
          timezone,
          handoffRequested: liveHandoffRequested,
          handoffCallbackNumber: liveHandoffRequested ? callbackNumber : "",
          handoffReason: liveHandoffRequested ? handoffReason : "",
          startedAt: isoNow()
        });
      }

      // Run doc creation in the background so the tool call returns immediately.
      (async () => {
        try {
          const created = await withTimeout(
            createDoc({ title, intro }),
            LIVE_DEMO_START_TIMEOUT_MS,
            "workspace_live_demo_start_timeout"
          );

          if (conversationId) {
            await saveSession(conversationId, {
              conversationId,
              status: "started",
              callerName,
              callerEmail,
              phone,
              company,
              timezone,
              docId: created.docId,
              docUrl: created.docUrl,
              handoffRequested: liveHandoffRequested,
              handoffCallbackNumber: liveHandoffRequested ? callbackNumber : "",
              handoffReason: liveHandoffRequested ? handoffReason : "",
              startedAt: isoNow()
            });
          }
        } catch (err) {
          const classified = classifyWorkspaceError(err);
          console.error("workspace_live_demo_start_bg_error", {
            code: classified.code,
            error: String(err?.message || err)
          });
          if (conversationId) {
            await saveSession(conversationId, {
              conversationId,
              status: "live_notes_unavailable",
              callerName,
              callerEmail,
              phone,
              company,
              timezone,
              liveNotesErrorCode: classified.code,
              liveNotesErrorAt: isoNow()
            });
          }
        }
      })();

      return res.json({
        ok: true,
        started: true,
        pending: true,
        conversationId: conversationId || null,
        docId: null,
        docUrl: null,
        handoffQueued: false,
        handoffAlreadyQueued: false,
        handoffNeedsCallbackNumber: false,
        handoffSelfTransfer: false,
        handoffErrorCode: null,
        handoffNeedsVerifiedNumber: false,
        handoffRetryable: false,
        handoffAgentMessage: null,
        handoffConversationId: null,
        handoffCallSid: null,
        nextAction: "continue"
      });
    }

    let docId = "";
    let docUrl = "";
    try {
      const created = await withTimeout(
        createDoc({ title, intro }),
        LIVE_DEMO_START_TIMEOUT_MS,
        "workspace_live_demo_start_timeout"
      );
      docId = created.docId;
      docUrl = created.docUrl;
    } catch (err) {
      const classified = classifyWorkspaceError(err);
      console.error("workspace_live_demo_start_error", { code: classified.code, error: String(err?.message || err) });
      if (conversationId) {
        await saveSession(conversationId, {
          conversationId,
          status: "live_notes_unavailable",
          callerName,
          callerEmail,
          phone,
          company,
          timezone,
          liveNotesErrorCode: classified.code,
          liveNotesErrorAt: isoNow()
        });
      }
      return res.json({
        ok: false,
        started: false,
        error: classified.code,
        retryable: classified.retryable,
        shouldStartLiveNotes: false,
        agentMessage: classified.agentMessage
      });
    }

    let handoff = null;
    let existingHandoff = null;
    let handoffNeedsCallbackNumber = false;
    let handoffSelfTransfer = false;
    let handoffError = null;
    if (liveHandoffRequested) {
      if (!callbackNumber || !isLikelyDialableCallback(callbackNumber)) {
        handoffNeedsCallbackNumber = true;
      } else if (callbackNumber === HANDOFF_HUMAN_NUMBER) {
        handoffSelfTransfer = true;
      } else {
        existingHandoff = await findExistingRecentHandoff({
          callbackNumber,
          sourceConversationId: conversationId
        });
        if (!existingHandoff) {
          try {
            handoff = await triggerWidgetHandoffCall({
              callbackNumber,
              callerName,
              callerEmail,
              sourceConversationId: conversationId,
              reason: handoffReason || "User requested live human transfer from widget"
            });
            markRecentHandoffByNumber(callbackNumber, {
              handoffConversationId: handoff?.conversationId || null,
              handoffCallSid: handoff?.callSid || null
            });
          } catch (err) {
            handoffError = classifyWidgetHandoffError(err);
          }
        }
      }
    }

    if (conversationId) {
      await saveSession(conversationId, {
        conversationId,
        status: "started",
        callerName,
        callerEmail,
        phone,
        company,
        timezone,
        docId,
        docUrl,
      handoffRequested: liveHandoffRequested,
      handoffCallbackNumber: liveHandoffRequested ? callbackNumber : "",
      handoffReason: liveHandoffRequested ? handoffReason : "",
        handoffNeedsCallbackNumber,
        handoffSelfTransfer,
        handoffErrorCode: handoffError?.code || "",
        handoffConversationId: handoff?.conversationId || existingHandoff?.handoffConversationId || "",
        handoffCallSid: handoff?.callSid || existingHandoff?.handoffCallSid || "",
        startedAt: isoNow()
      });
    }

    return res.json({
      ok: true,
      started: true,
      conversationId: conversationId || null,
      docId,
      docUrl,
      handoffQueued: Boolean(handoff) || Boolean(existingHandoff),
      handoffAlreadyQueued: Boolean(existingHandoff),
      handoffNeedsCallbackNumber,
      handoffSelfTransfer,
      handoffErrorCode: handoffError?.code || null,
      handoffNeedsVerifiedNumber: Boolean(handoffError?.needsVerifiedNumber),
      handoffRetryable: Boolean(handoffError?.retryable),
      handoffAgentMessage: handoffError?.agentMessage || null,
      handoffConversationId: handoff?.conversationId || existingHandoff?.handoffConversationId || null,
      handoffCallSid: handoff?.callSid || existingHandoff?.handoffCallSid || null,
      nextAction: "Use workspace-live-demo/note for each note, then finalize"
    });
  } catch (err) {
    console.error("start_error", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.post("/workspace-live-demo/note", requireAuth, async (req, res) => {
  try {
    const conversationId = strip(req.body?.conversationId || req.body?.conversation_id || "");
    const note = strip(req.body?.note || req.body?.text || "");
    const speaker = strip(req.body?.speaker || "caller");
    const ts = strip(req.body?.timestamp || isoNow());

    if (!note) return res.status(400).json({ ok: false, error: "note is required" });

    const resolved = await resolveDocId({ docId: req.body?.docId, conversationId });
    let docId = resolved.docId;
    if (!docId && conversationId) {
      const callerName = strip(req.body?.callerName || req.body?.name || resolved.session?.callerName || "Unknown Caller");
      const callerEmail = normalizeEmail(req.body?.callerEmail || req.body?.email || resolved.session?.callerEmail || "");
      const phone = strip(req.body?.phone || req.body?.phone_number || resolved.session?.phone || "n/a");
      const company = strip(req.body?.company || resolved.session?.company || "n/a");
      const timezone = strip(req.body?.timezone || resolved.session?.timezone || "n/a");

      const title = `Wrk.Flo Live Demo - ${callerName} - ${new Date().toISOString().slice(0, 10)} (Auto-Recovered)`;
      const intro = [
        "Wrk.Flo Live Demo Notes (Auto-Recovered)",
        `Conversation ID: ${conversationId}`,
        `Caller: ${callerName}`,
        `Email: ${callerEmail || "n/a"}`,
        `Phone: ${phone}`,
        `Company: ${company}`,
        `Timezone: ${timezone}`,
        `Recovered: ${isoNow()}`,
        "",
        "Transcript / Notes:"
      ].join("\n");

      const created = await withTimeout(
        createDoc({ title, intro }),
        Math.max(LIVE_DEMO_START_TIMEOUT_MS, 12000),
        "workspace_live_demo_note_recovery_timeout"
      );
      docId = created.docId;

      await saveSession(conversationId, {
        conversationId,
        status: "in_progress",
        callerName,
        callerEmail,
        phone,
        company,
        timezone,
        docId: created.docId,
        docUrl: created.docUrl,
        recoveredAt: isoNow()
      });
    }

    if (!docId) {
      return res.json({
        ok: true,
        pending: true,
        skipped: true,
        reason: "notes_session_not_ready",
        conversationId: conversationId || null
      });
    }

    await withTimeout(
      appendDocText({ docId, text: `[${ts}] ${speaker}: ${note}` }),
      LIVE_DEMO_DOC_OP_TIMEOUT_MS,
      "workspace_live_demo_note_timeout"
    );

    if (conversationId) {
      await saveSession(conversationId, {
        conversationId,
        docId,
        status: "in_progress",
        lastNoteAt: isoNow(),
        lastSpeaker: speaker
      });
    }

    return res.json({ ok: true, docId, conversationId: conversationId || null });
  } catch (err) {
    const classified = classifyWorkspaceError(err);
    console.error("note_error", { code: classified.code, error: String(err?.message || err) });
    return res.json({
      ok: false,
      error: classified.code,
      retryable: classified.retryable,
      agentMessage: classified.agentMessage
    });
  }
});

async function finalizeWorkspaceNotes(body = {}) {
  const conversationId = strip(body?.conversationId || body?.conversation_id || "");
  const resolved = await resolveDocId({ docId: body?.docId, conversationId });
    let docId = resolved.docId;
    let docUrl = docId ? `https://docs.google.com/document/d/${docId}/edit` : "";

  const rawCallerEmail = body?.callerEmail || body?.email || resolved.session?.callerEmail || "";
    const callerEmail = normalizeEmail(rawCallerEmail);
  const callerName = strip(body?.callerName || body?.name || resolved.session?.callerName || "there");
  const summary = strip(body?.summary || "Thanks for the live demo conversation.");
    const sendUserCopy = Boolean(
    body?.sendUserCopy ?? body?.send_user_copy ?? false
    );
    const alreadyFinalized = Boolean(resolved.session?.finalizedAt || resolved.session?.status === "finalized");
    const alreadyUserEmailed = Boolean(resolved.session?.emailed);
    const alreadyInternalEmailed = Boolean(resolved.session?.internalEmailed);

    // Internal notes recipients are always notified.
    const internalTo = normalizeEmail(process.env.INTERNAL_NOTES_EMAIL || "wrkflo.biz@gmail.com");
    const internalCc = normalizeEmail(process.env.DEFAULT_CC_EMAIL || "moses@wrkflo.biz");
  const cc = normalizeEmail(body?.cc || process.env.DEFAULT_CC_EMAIL || "moses@wrkflo.biz");

    if (sendUserCopy && rawCallerEmail && !isLikelyEmail(rawCallerEmail)) {
    return {
        ok: false,
        error: "invalid_caller_email",
        retryable: false,
        agentMessage: "That email sounded off. Please repeat the best email address and I will send the notes."
    };
    }

    // Fallback path: if finalize is called without an existing session/doc, recover by creating one now.
    if (!docId) {
      const title = `Wrk.Flo Live Demo - ${callerName} - ${new Date().toISOString().slice(0, 10)} (Recovered)`;
      const intro = [
        "Wrk.Flo Live Demo Notes (Recovered Session)",
        `Conversation ID: ${conversationId || "n/a"}`,
        `Caller: ${callerName}`,
        `Email: ${callerEmail || "n/a"}`,
        `Finalized: ${isoNow()}`,
        "",
        "Recovered Summary:"
      ].join("\n");

      const created = await createDoc({ title, intro });
      docId = created.docId;
      docUrl = created.docUrl;
      await appendDocText({ docId, text: summary });
    }

    const internalBody = [
      `Conversation notes finalized for ${callerName}.`,
      "",
      summary,
      "",
      `Doc: ${docUrl}`,
      "",
      `Conversation ID: ${conversationId || "n/a"}`,
      `User copy requested: ${sendUserCopy ? "yes" : "no"}`,
      sendUserCopy && callerEmail ? `User email: ${callerEmail}` : "User email: n/a"
    ].join("\n");

    if (internalTo && !alreadyInternalEmailed) {
      await sendEmailWithRetry({
        to: internalTo,
        cc: internalCc,
        subject: "Wrk.Flo Call Notes (Internal)",
        bodyText: internalBody
      });
    }

    if (sendUserCopy && callerEmail && !alreadyUserEmailed) {
      const userBody = [
        `Hi ${callerName},`,
        "",
        summary,
        "",
        `Your call notes: ${docUrl}`,
        "",
        "- Wrk.Flo Team"
      ].join("\n");

      await sendEmailWithRetry({
        to: callerEmail,
        cc,
        subject: "Your Wrk.Flo Call Notes",
        bodyText: userBody
      });
    }

    if (conversationId) {
      const emailed = Boolean((sendUserCopy && callerEmail) || alreadyUserEmailed);
      const internalEmailed = Boolean(alreadyInternalEmailed || internalTo);
      await saveSession(conversationId, {
        conversationId,
        docId,
        docUrl,
        status: "finalized",
        finalizedAt: isoNow(),
        finalizedCount: Number(resolved.session?.finalizedCount || 0) + 1,
        alreadyFinalized,
        emailed,
        internalEmailed,
        finalSummary: summary
      });
    }

    const emailed = Boolean((sendUserCopy && callerEmail && !alreadyUserEmailed) || alreadyUserEmailed);
    const internalEmailed = Boolean(alreadyInternalEmailed || internalTo);
  return {
      ok: true,
      conversationId: conversationId || null,
      docId,
      docUrl,
      alreadyFinalized,
      emailed,
      internalEmailed
  };
}

app.post("/workspace-live-demo/finalize", requireAuth, async (req, res) => {
  try {
    return res.json(await finalizeWorkspaceNotes(req.body || {}));
  } catch (err) {
    const classified = classifyWorkspaceError(err);
    console.error("finalize_error", { code: classified.code, error: String(err?.message || err) });
    return res.json({
      ok: false,
      error: classified.code,
      retryable: classified.retryable,
      agentMessage: classified.agentMessage
    });
  }
});

app.get("/wrkflo-tools/catalog", requireAuth, async (req, res) => {
  return res.json({
    ok: true,
    service: "wrkflo-tool-gateway",
    tools: WRKFLO_TOOL_DEFINITIONS
  });
});

app.post("/wrkflo-tools/:toolName", requireAuth, async (req, res) => {
  try {
    const result = await executeWrkfloTool(req.params.toolName, req.body || {});
    return res.json(result);
  } catch (err) {
    console.error("wrkflo_tool_error", {
      tool: req.params.toolName,
      error: String(err?.message || err)
    });
    return res.json({
      ok: false,
      error: "wrkflo_tool_failed",
      agentMessage:
        "The WrkFlo tool gateway hit an internal error. I can continue the call and take a follow-up note."
    });
  }
});

app.get("/mcp", requireAuth, async (req, res) => {
  return res.json({
    ok: true,
    service: "wrkflo-mcp",
    protocol: "streamable-http-json-rpc",
    tools: WRKFLO_TOOL_DEFINITIONS
  });
});

app.post("/mcp", requireAuth, async (req, res) => {
  const requests = Array.isArray(req.body) ? req.body : [req.body];

  const responses = await Promise.all(
    requests.map(async (rpc) => {
      const id = rpc?.id ?? null;
      const method = String(rpc?.method || "");
      const params = rpc?.params || {};

      try {
        if (method === "initialize") {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: params?.protocolVersion || "2025-03-26",
              capabilities: { tools: {} },
              serverInfo: { name: "wrkflo-mcp", version: "1.0.0" }
            }
          };
        }

        if (method === "notifications/initialized") return null;

        if (method === "tools/list") {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              tools: WRKFLO_TOOL_DEFINITIONS.map((tool) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
              }))
            }
          };
        }

        if (method === "tools/call") {
          const result = await executeWrkfloTool(params?.name, params?.arguments || {});
          return mcpToolResult(id, result);
        }

        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        };
      } catch (err) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32603, message: String(err?.message || err) }
        };
      }
    })
  );

  const filtered = responses.filter(Boolean);
  if (Array.isArray(req.body)) return res.json(filtered);
  if (filtered.length === 0) return res.status(202).send();
  return res.json(filtered[0]);
});

app.listen(PORT, () => {
  console.log(`workspace-google-webhooks listening on ${PORT}`);
});
