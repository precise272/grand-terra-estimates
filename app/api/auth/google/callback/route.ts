import {db} from "@/lib/server";
import {clearCookie,googleConfig,issueSession,stateCookieName} from "@/lib/auth";
const fail=(url:string,code:string)=>Response.redirect(new URL("/login?error="+encodeURIComponent(code),url),302);
export async function GET(request:Request){
 const url=new URL(request.url),code=url.searchParams.get("code"),state=url.searchParams.get("state");
 const expected=(request.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(stateCookieName(request.url)+"="))?.split("=")[1];
 if(!code||!state||!expected||state!==expected)return fail(request.url,"google-state");
 const {clientId,clientSecret}=googleConfig();if(!clientId||!clientSecret)return fail(request.url,"google-config");
 try{
 const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:url.origin+"/api/auth/google/callback",grant_type:"authorization_code"})});
 if(!tokenResponse.ok)return fail(request.url,"google-token");const token=await tokenResponse.json() as {access_token?:string};if(!token.access_token)return fail(request.url,"google-token");
 const infoResponse=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:"Bearer "+token.access_token}});if(!infoResponse.ok)return fail(request.url,"google-profile");
 const info=await infoResponse.json() as {sub?:string;email?:string;email_verified?:boolean;name?:string};if(!info.sub||!info.email||info.email_verified!==true)return fail(request.url,"google-email");
 let account=await db().prepare("SELECT id FROM accounts WHERE google_sub=?").bind(info.sub).first<{id:string}>();
 if(!account){const email=info.email.toLowerCase();const existing=await db().prepare("SELECT id FROM accounts WHERE email=?").bind(email).first();if(existing)return fail(request.url,"existing-email");const id=crypto.randomUUID(),now=Date.now();await db().prepare("INSERT INTO accounts (id,email,name,password_hash,google_sub,email_verified,created_at,updated_at) VALUES (?,?,?,NULL,?,1,?,?)").bind(id,email,(info.name||email).slice(0,120),info.sub,now,now).run();account={id}}
 const response=Response.redirect(new URL("/",request.url),302);response.headers.append("Set-Cookie",clearCookie(stateCookieName(request.url),request.url));response.headers.append("Set-Cookie",await issueSession(account.id,request.url));response.headers.set("Cache-Control","no-store");return response
 }catch(error){console.error(error);return fail(request.url,"google-failed")}
}
