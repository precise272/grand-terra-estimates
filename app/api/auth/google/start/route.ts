import {authError,cookie,googleConfig,randomToken,stateCookieName} from "@/lib/auth";
export async function GET(request:Request){
 const {clientId,clientSecret}=googleConfig();if(!clientId||!clientSecret)return authError("Google sign-in has not been configured.",503);
 const origin=new URL(request.url).origin,state=randomToken(),redirectUri=origin+"/api/auth/google/callback";
 const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");url.search=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:"code",scope:"openid email profile",state,prompt:"select_account"}).toString();
 return new Response(null,{status:302,headers:{Location:url.toString(),"Set-Cookie":cookie(stateCookieName(request.url),state,request.url,600),"Cache-Control":"no-store"}})
}
