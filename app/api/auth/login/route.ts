import {db} from "@/lib/server";
import {authError,clearAttempts,hashPassword,issueSession,noteFailedAttempt,revokeSession,sameOrigin,sha256,tooManyAttempts,verifyPassword} from "@/lib/auth";
export async function POST(request:Request){
 if(!sameOrigin(request))return authError("Invalid request origin.",403);
 let value:Record<string,unknown>;try{value=await request.json() as Record<string,unknown>}catch{return authError("Invalid form.")}
 const email=String(value.email||"").trim().toLowerCase(),password=String(value.password||"");if(!email||email.length>200||!password||password.length>256)return authError("Enter your email and password.");
 const key=await sha256("login:"+email);if(await tooManyAttempts(key))return authError("Too many attempts. Try again in 15 minutes.",429);
 try{const row=await db().prepare("SELECT id,password_hash FROM accounts WHERE email=?").bind(email).first<{id:string;password_hash:string|null}>();
 const valid=row?.password_hash?await verifyPassword(password,row.password_hash):false;if(!row)await hashPassword(password);
 if(!valid||!row){await noteFailedAttempt(key);return authError("Email or password was not recognized.",401)}
 await clearAttempts(key);await revokeSession(request.headers,request.url);return Response.json({ok:true},{headers:{"Set-Cookie":await issueSession(row.id,request.url),"Cache-Control":"no-store"}})
 }catch(error){console.error(error);return authError("Sign in is temporarily unavailable.",503)}
}

