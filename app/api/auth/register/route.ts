import {db} from "@/lib/server";
import {authError,hashPassword,issueSession,noteFailedAttempt,revokeSession,sameOrigin,sha256,tooManyAttempts} from "@/lib/auth";
export async function POST(request:Request){
 if(!sameOrigin(request))return authError("Invalid request origin.",403);
 let value:Record<string,unknown>;try{value=await request.json() as Record<string,unknown>}catch{return authError("Invalid form.")}
 const name=String(value.name||"").trim().slice(0,120),email=String(value.email||"").trim().toLowerCase(),password=String(value.password||"");
 if(name.length<2)return authError("Enter your name.");
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200)return authError("Enter a valid email address.");
 if(password.length<12||password.length>256)return authError("Use a password between 12 and 256 characters.");
 const limitKey=await sha256("register:"+(request.headers.get("cf-connecting-ip")||email));if(await tooManyAttempts(limitKey))return authError("Too many new accounts from this connection. Try again later.",429);
 try{const existing=await db().prepare("SELECT id FROM accounts WHERE email=?").bind(email).first();if(existing)return authError("This email already has an account. Sign in instead.",409);
 await noteFailedAttempt(limitKey);const id=crypto.randomUUID(),now=Date.now(),hash=await hashPassword(password);
 await db().prepare("INSERT INTO accounts (id,email,name,password_hash,google_sub,email_verified,created_at,updated_at) VALUES (?,?,?,?,NULL,0,?,?)").bind(id,email,name,hash,now,now).run();
 await revokeSession(request.headers,request.url);return Response.json({ok:true},{headers:{"Set-Cookie":await issueSession(id,request.url),"Cache-Control":"no-store"}})
 }catch(error){console.error(error);return authError("Could not create account. Please try again.",503)}
}


