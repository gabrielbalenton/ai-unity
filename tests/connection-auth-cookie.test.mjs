import test from "node:test";
import assert from "node:assert/strict";
import {
 sealConnectionAuthSession,
 openConnectionAuthSession,
 CONNECTION_AUTH_COOKIE
} from "../lib/security/connection-auth-cookie.mjs";

const secret="test-only-session-secret-that-is-long-enough-123456789";
const session={
 service:"openrouter",
 projectId:"fpx",
 state:"state-value-not-real",
 verifier:"verifier-value-not-real",
 challenge:"challenge-value-not-real",
 challengeMethod:"S256",
 expiresAt:"2026-10-08T05:00:00.000Z"
};

test("connection auth session is encrypted and can be recovered server-side",()=>{
 const token=sealConnectionAuthSession(session,secret);
 assert.match(token,/^v1\./);
 assert.equal(token.includes("verifier-value-not-real"),false);
 assert.equal(token.includes("openrouter"),false);
 assert.deepEqual(openConnectionAuthSession(token,secret),session);
});

test("tampered connection auth cookies fail closed",()=>{
 const token=sealConnectionAuthSession(session,secret);
 const parts=token.split(".");
 parts[2]=parts[2].slice(0,-1)+(parts[2].endsWith("A")?"B":"A");
 assert.throws(()=>openConnectionAuthSession(parts.join("."),secret),/could not be verified|Invalid/);
});

test("a different server secret cannot open the ticket",()=>{
 const token=sealConnectionAuthSession(session,secret);
 assert.throws(()=>openConnectionAuthSession(token,"another-long-test-secret-that-is-not-the-same-987654321"),/could not be verified/);
});

test("cookie settings are server-only and short-lived",()=>{
 assert.equal(CONNECTION_AUTH_COOKIE.httpOnly,true);
 assert.equal(CONNECTION_AUTH_COOKIE.secure,true);
 assert.equal(CONNECTION_AUTH_COOKIE.sameSite,"lax");
 assert.equal(CONNECTION_AUTH_COOKIE.name.startsWith("__Host-"),true);
 assert.ok(CONNECTION_AUTH_COOKIE.maxAge<=15*60);
});
