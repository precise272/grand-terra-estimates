import { headers } from "next/headers";
import { chatGPTSignInPath,getChatGPTUser } from "./chatgpt-auth";
import Workspace from "@/components/workspace";
export const dynamic="force-dynamic";
export default async function Home(){
 const user=await getChatGPTUser();
 const host=(await headers()).get("host")||"";
 if(user||host.startsWith("127.0.0.1")||host.startsWith("localhost"))return <Workspace/>;
 return <main className="auth-page"><div className="auth-card"><div className="auth-mark">GT</div><div className="eyebrow">GRAND TERRA ESTIMATES</div><h1>Your work, securely in one place.</h1><p>Sign in to manage your clients, estimates, invoices, and company settings. Every account has its own private records.</p><a className="auth-button" href={chatGPTSignInPath("/")} target="_top">Sign in with ChatGPT</a><small>Authentication is handled by ChatGPT. Your estimates and client details are stored with your account.</small></div></main>;
}

