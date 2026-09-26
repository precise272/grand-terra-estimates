import {env} from "cloudflare:workers";
import {db} from "@/lib/server";

export type Identity={owner:string;email:string;fullName:string;provider:"account"|"chatgpt"};
const SESSION_DAYS=180;
const ITERATIONS=600000;
const encoder=new TextEncoder();
const raw=(bytes:Uint8Array)=>Array.from(bytes,b=>String.fromCharCode(b)).join("");
const b64=(bytes:Uint8Array)=>btoa(raw(bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const from64=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
export const randomToken=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
export async function sha256(value:string){return b64(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))))}
async function derive(password:string,salt:Uint8Array){const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);return new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:Uint8Array.from(salt),iterations:ITERATIONS,hash:"SHA-256"},key,256))}
export async function hashPassword(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));return `pbkdf2-sha256$${ITERATIONS}$${b64(salt)}$${b64(await derive(password,salt))}`}
export async function verifyPassword(password:string,stored:string){const [scheme,iterations,salt,expected]=stored.split("$");if(scheme!=="pbkdf2-sha256"||Number(iterations)!==ITERATIONS||!salt||!expected)return false;let given:Uint8Array;try{given=await derive(password,from64(salt))}catch{return false}const target=from64(expected);if(given.length!==target.length)return false;let diff=0;for(let i=0;i<given.length;i++)diff|=given[i]^target[i];return diff===0}
const cookieValue=(headers:Headers,name:string)=>{const found=(headers.get("cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="));return found?.slice(name.length+1)||""};
const secure=(url:string)=>new URL(url).protocol==="https:";
export const sessionCookieName=(url:string)=>secure(url)?"__Host-gt_session":"gt_session_local";
export const stateCookieName=(url:string)=>secure(url)?"__Host-gt_oauth":"gt_oauth_local";
export function cookie(name:string,value:string,url:string,maxAge:number){return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure(url)?"; Secure":""}`}
export function clearCookie(name:string,url:string){return cookie(name,"",url,0)}
export function sameOrigin(request:Request){const origin=request.headers.get("origin");return !origin||origin===new URL(request.url).origin}
export function googleConfig(){const values=env as unknown as Record<string,string|undefined>;return{clientId:values.GOOGLE_CLIENT_ID||"",clientSecret:values.GOOGLE_CLIENT_SECRET||""}}
export async function issueSession(accountId:string,url:string){const token=randomToken(),now=Date.now(),expires=now+SESSION_DAYS*86400000;await db().prepare("DELETE FROM auth_sessions WHERE expires_at<?").bind(now).run();await db().prepare("INSERT INTO auth_sessions (token_hash,account_id,expires_at,created_at,last_seen_at) VALUES (?,?,?,?,?)").bind(await sha256(token),accountId,expires,now,now).run();return cookie(sessionCookieName(url),token,url,SESSION_DAYS*86400)}
export async function revokeSession(headers:Headers,url:string){const token=cookieValue(headers,sessionCookieName(url));if(token)await db().prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(await sha256(token)).run()}
export async function identityFromHeaders(headers:Headers,url:string):Promise<Identity|null>{
 const token=cookieValue(headers,sessionCookieName(url));
 if(token){const row=await db().prepare("SELECT a.id,a.email,a.name FROM auth_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?").bind(await sha256(token),Date.now()).first<{id:string;email:string;name:string}>();if(row)return{owner:"account:"+row.id,email:row.email,fullName:row.name,provider:"account"}}
 const sitesHost=new URL(url).hostname.endsWith(".chatgpt.site");const id=sitesHost?headers.get("oai-authenticated-user-id"):null,email=sitesHost?headers.get("oai-authenticated-user-email"):null;if(id&&email){let fullName="";if(headers.get("oai-authenticated-user-full-name-encoding")==="percent-encoded-utf-8"){try{fullName=decodeURIComponent(headers.get("oai-authenticated-user-full-name")||"")}catch{}}return{owner:id,email,fullName,provider:"chatgpt"}}
 return null
}
export async function identityFor(request:Request){return identityFromHeaders(request.headers,request.url)}
export async function ownerForRequest(request:Request){return(await identityFor(request))?.owner||null}
export async function tooManyAttempts(key:string){const row=await db().prepare("SELECT count,window_start,locked_until FROM auth_attempts WHERE key=?").bind(key).first<{count:number;window_start:number;locked_until:number}>();return !!row&&row.locked_until>Date.now()}
export async function noteFailedAttempt(key:string){const now=Date.now();await db().prepare("INSERT INTO auth_attempts (key,count,window_start,locked_until) VALUES (?,1,?,0) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start<? THEN 1 ELSE count+1 END,window_start=CASE WHEN window_start<? THEN ? ELSE window_start END,locked_until=CASE WHEN window_start>=? AND count>=4 THEN ? ELSE 0 END").bind(key,now,now-900000,now-900000,now,now-900000,now+900000).run()}
export async function clearAttempts(key:string){await db().prepare("DELETE FROM auth_attempts WHERE key=?").bind(key).run()}
export function authError(message:string,status=400){return Response.json({error:message},{status,headers:{"Cache-Control":"no-store"}})}

