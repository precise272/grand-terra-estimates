import { bucket,db,fail,ownerFor,serverError } from "@/lib/server";
export async function GET(request:Request){
 const owner=ownerFor(request);if(!owner)return fail("Sign in.",401);
 try{const row=await db().prepare("SELECT logo_key FROM settings WHERE owner=?").bind(owner).first<{logo_key:string}>();if(!row?.logo_key)return fail("No logo.",404);
  const file=await bucket().get(row.logo_key);if(!file)return fail("No logo.",404);
  return new Response(file.body,{headers:{"Content-Type":file.httpMetadata?.contentType||"image/png","Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
 }catch(error){return serverError(error)}
}
export async function POST(request:Request){
 const owner=ownerFor(request);if(!owner)return fail("Sign in.",401);
 try{const form=await request.formData();const file=form.get("file");if(!(file instanceof File)||!["image/png","image/jpeg","image/webp"].includes(file.type))return fail("Choose a PNG, JPEG, or WebP logo.");if(file.size>4*1024*1024)return fail("Logo must be under 4 MB.");
  const key=owner+"/company-logo/"+crypto.randomUUID();await bucket().put(key,file.stream(),{httpMetadata:{contentType:file.type}});
  const prior=await db().prepare("SELECT logo_key FROM settings WHERE owner=?").bind(owner).first<{logo_key:string}>();
  await db().prepare("INSERT INTO settings (owner,logo_key) VALUES (?,?) ON CONFLICT(owner) DO UPDATE SET logo_key=excluded.logo_key").bind(owner,key).run();
  if(prior?.logo_key)await bucket().delete(prior.logo_key);
  return Response.json({logoKey:key});
 }catch(error){return serverError(error)}
}
export async function DELETE(request:Request){
 const owner=ownerFor(request);if(!owner)return fail("Sign in.",401);
 try{const row=await db().prepare("SELECT logo_key FROM settings WHERE owner=?").bind(owner).first<{logo_key:string}>();if(row?.logo_key)await bucket().delete(row.logo_key);
  await db().prepare("UPDATE settings SET logo_key='' WHERE owner=?").bind(owner).run();return Response.json({ok:true});
 }catch(error){return serverError(error)}
}

