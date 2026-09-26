import {headers} from "next/headers";
import {identityFromHeaders} from "@/lib/auth";
import Workspace from "@/components/workspace";
import Landing from "@/components/landing";
export const dynamic="force-dynamic";
export default async function Home(){const h=await headers(),host=h.get("host")||"localhost",proto=host.startsWith("127.0.0.1")||host.startsWith("localhost")?"http":h.get("x-forwarded-proto")||"https";const identity=await identityFromHeaders(h,proto+"://"+host+"/");return identity?<Workspace/>:<Landing/>}

