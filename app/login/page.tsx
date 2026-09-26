import {headers} from "next/headers";
import AuthScreen from "@/components/auth-screen";
import {googleConfig} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){const h=await headers(),host=h.get("host")||"";return <AuthScreen mode="login" googleEnabled={!!(googleConfig().clientId&&googleConfig().clientSecret)} chatgptAvailable={host.endsWith("chatgpt.site")} initialError={(await searchParams).error}/>}
