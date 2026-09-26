import { bucket, db, fail, serverError } from "@/lib/server";
import {identityFor,ownerForRequest,sameOrigin} from "@/lib/auth";
type Payload=Record<string,unknown>;
const text=(v:unknown,max=3000)=>String(v??"").trim().slice(0,max);
const integer=(v:unknown)=>Number.isFinite(Number(v))?Math.max(0,Math.round(Number(v))):0;
const stamp=()=>Date.now();
const json=(value:unknown)=>Response.json(value,{headers:{"Cache-Control":"no-store"}});
function cleanItems(source:unknown){return Array.isArray(source)?source.slice(0,100).map((raw:Payload)=>({id:text(raw.id,80)||crypto.randomUUID(),description:text(raw.description,500),quantity:Math.min(100000,Math.max(0,Number(raw.quantity)||0)),unit:text(raw.unit,40)||"each",unitPriceCents:integer(raw.unitPriceCents),taxable:raw.taxable!==false})):[]}
function clientValue(v:Payload){return{name:text(v.name,160),company:text(v.company,160),email:text(v.email,200),phone:text(v.phone,80),billingAddress:text(v.billingAddress,600),siteAddress:text(v.siteAddress,600),notes:text(v.notes,3000)}}
function docValue(v:Payload){
 const kind=v.kind==="invoice"?"invoice":"estimate";
 const allowed=kind==="invoice"?["draft","sent","partial","paid","overdue"]:["draft","sent","accepted","declined"];
 return{clientId:text(v.clientId,80)||null,kind,number:text(v.number,60),title:text(v.title,200),status:allowed.includes(String(v.status))?String(v.status):"draft",issueDate:text(v.issueDate,20),dueDate:text(v.dueDate,20),province:text(v.province,2).toUpperCase()||"ON",taxRate:Math.min(30000,integer(v.taxRate)),discountCents:integer(v.discountCents),depositCents:integer(v.depositCents),notes:text(v.notes,5000),terms:text(v.terms,5000),itemsJson:JSON.stringify(cleanItems(v.items)),clientSnapshotJson:JSON.stringify(v.clientSnapshot&&typeof v.clientSnapshot==="object"?v.clientSnapshot:{})}
}
const colour=(v:unknown,fallback:string)=>/^#[0-9a-fA-F]{6}$/.test(String(v))?String(v):fallback;
function companyValue(v:Payload){
 const featureSource=v.features&&typeof v.features==="object"?v.features as Payload:{};
 const flags=["photos","discounts","deposits","taxNumber","signature","paymentInstructions","jobAddress"];
 const features=Object.fromEntries(flags.map(k=>[k,featureSource[k]!==false]));
 const style=["classic","modern","minimal"].includes(String(v.documentStyle))?String(v.documentStyle):"classic";
 const lh=v.letterhead&&typeof v.letterhead==="object"?v.letterhead as Payload:{};
 const choose=(value:unknown,allowed:string[],fallback:string)=>allowed.includes(String(value))?String(value):fallback;
   const number=(value:unknown,min:number,max:number,fallback:number)=>Math.min(max,Math.max(min,Number.isFinite(Number(value))?Number(value):fallback));
  const optionalColour=(value:unknown)=>/^#[0-9a-fA-F]{6}$/.test(String(value))?String(value):"";
  const letterhead={logoPosition:choose(lh.logoPosition,["left","center","right"],"left"),logoSize:choose(lh.logoSize,["small","medium","large"],"medium"),headerStyle:choose(lh.headerStyle,["line","band","none"],"line"),companyAlignment:choose(lh.companyAlignment,["left","center","right"],"right"),layoutMode:choose(lh.layoutMode,["auto","logoFirst","detailsFirst"],"auto"),dividerWidth:choose(lh.dividerWidth,["short","medium","full"],"full"),dividerPosition:choose(lh.dividerPosition,["left","center","right"],"center"),topPadding:number(lh.topPadding,8,30,14),elementGap:number(lh.elementGap,0,20,5),dividerGap:number(lh.dividerGap,0,25,7),afterDividerGap:number(lh.afterDividerGap,2,22,9),dividerThickness:number(lh.dividerThickness,.5,5,1),fontFamily:choose(lh.fontFamily,["helvetica","times","courier"],"helvetica"),nameSize:number(lh.nameSize,10,24,17),detailSize:number(lh.detailSize,7,13,9),nameColor:optionalColour(lh.nameColor),detailColor:optionalColour(lh.detailColor)||"#526271",dividerColor:optionalColour(lh.dividerColor),showLogo:lh.showLogo!==false,showName:lh.showName!==false,showAddress:lh.showAddress!==false,showEmail:lh.showEmail!==false,showPhone:lh.showPhone!==false,showTaxNumber:lh.showTaxNumber!==false};
 return{businessName:text(v.businessName,180),email:text(v.email,200),phone:text(v.phone,80),address:text(v.address,600),taxNumber:text(v.taxNumber,100),paymentInstructions:text(v.paymentInstructions,1500),defaultTerms:text(v.defaultTerms,1500),province:text(v.province,2).toUpperCase()||"ON",accentColor:colour(v.accentColor,"#183f8f"),secondaryColor:colour(v.secondaryColor,"#d8b36a"),documentStyle:style,footerText:text(v.footerText,500),estimatePrefix:text(v.estimatePrefix,12).toUpperCase()||"EST",invoicePrefix:text(v.invoicePrefix,12).toUpperCase()||"INV",emailSubject:text(v.emailSubject,300),emailMessage:text(v.emailMessage,3000),preferencesJson:JSON.stringify(features),letterheadJson:JSON.stringify(letterhead)}
}
export async function GET(request:Request){
 const identity=await identityFor(request),owner=identity?.owner;if(!owner)return fail("Sign in to access your records.",401);
 try{
  const database=db();
  const [clients,documents,photos,settings,profile,catalog]=await Promise.all([
   database.prepare("SELECT * FROM clients WHERE owner=? ORDER BY name COLLATE NOCASE").bind(owner).all(),
   database.prepare("SELECT * FROM documents WHERE owner=? ORDER BY updated_at DESC").bind(owner).all(),
   database.prepare("SELECT id,document_id,filename,mime,size,created_at FROM photos WHERE owner=? ORDER BY created_at DESC").bind(owner).all(),
   database.prepare("SELECT * FROM settings WHERE owner=?").bind(owner).first(),
   database.prepare("SELECT * FROM user_profiles WHERE owner=?").bind(owner).first(),
   database.prepare("SELECT * FROM catalog_entries WHERE owner=? ORDER BY kind,name COLLATE NOCASE").bind(owner).all()
  ]);
  return json({clients:clients.results,documents:documents.results,photos:photos.results,settings,profile,catalog:catalog.results,auth:{email:identity?.email||"",fullName:identity?.fullName||"",provider:identity?.provider||"account"}});
 }catch(error){return serverError(error)}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return fail("Invalid request origin.",403);const owner=await ownerForRequest(request);if(!owner)return fail("Sign in to save records.",401);
 let body:Payload;try{body=await request.json() as Payload}catch{return fail("Invalid request.")}
 const action=text(body.action,50),value=body.value&&typeof body.value==="object"?body.value as Payload:{},id=text(body.id,80),database=db();
 try{
  if(action==="saveClient"){
   const c=clientValue(value);if(!c.name)return fail("Client name is required.");
   const key=id||crypto.randomUUID();if(id){const row=await database.prepare("SELECT id FROM clients WHERE id=? AND owner=?").bind(id,owner).first();if(!row)return fail("Client not found.",404);
    await database.prepare("UPDATE clients SET name=?,company=?,email=?,phone=?,billing_address=?,site_address=?,notes=?,updated_at=? WHERE id=? AND owner=?").bind(c.name,c.company,c.email,c.phone,c.billingAddress,c.siteAddress,c.notes,stamp(),id,owner).run();
   }else await database.prepare("INSERT INTO clients (id,owner,name,company,email,phone,billing_address,site_address,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(key,owner,c.name,c.company,c.email,c.phone,c.billingAddress,c.siteAddress,c.notes,stamp(),stamp()).run();
   return json({id:key});
  }
  if(action==="deleteClient"){if(!id)return fail("Client id is required.");await database.prepare("DELETE FROM clients WHERE id=? AND owner=?").bind(id,owner).run();return json({ok:true})}
  if(action==="saveDocument"){
   const d=docValue(value);if(!d.number||!d.issueDate)return fail("Document number and issue date are required.");
   if(d.clientId){const row=await database.prepare("SELECT id FROM clients WHERE id=? AND owner=?").bind(d.clientId,owner).first();if(!row)return fail("Select a saved client.")}
   const key=id||crypto.randomUUID();
   if(id){const row=await database.prepare("SELECT id FROM documents WHERE id=? AND owner=?").bind(id,owner).first();if(!row)return fail("Document not found.",404);
    await database.prepare("UPDATE documents SET client_id=?,kind=?,number=?,title=?,status=?,issue_date=?,due_date=?,province=?,tax_rate=?,discount_cents=?,deposit_cents=?,notes=?,terms=?,items_json=?,client_snapshot_json=?,updated_at=? WHERE id=? AND owner=?").bind(d.clientId,d.kind,d.number,d.title,d.status,d.issueDate,d.dueDate,d.province,d.taxRate,d.discountCents,d.depositCents,d.notes,d.terms,d.itemsJson,d.clientSnapshotJson,stamp(),id,owner).run();
   }else await database.prepare("INSERT INTO documents (id,owner,client_id,kind,number,title,status,issue_date,due_date,province,tax_rate,discount_cents,deposit_cents,notes,terms,items_json,client_snapshot_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(key,owner,d.clientId,d.kind,d.number,d.title,d.status,d.issueDate,d.dueDate,d.province,d.taxRate,d.discountCents,d.depositCents,d.notes,d.terms,d.itemsJson,d.clientSnapshotJson,stamp(),stamp()).run();
   return json({id:key});
  }
  if(action==="deleteDocument"){
   if(!id)return fail("Document id is required.");
   const rows=await database.prepare("SELECT key FROM photos WHERE document_id=? AND owner=?").bind(id,owner).all();
   await Promise.all(rows.results.map(p=>bucket().delete(String(p.key))));
   await database.prepare("DELETE FROM photos WHERE document_id=? AND owner=?").bind(id,owner).run();
   await database.prepare("DELETE FROM documents WHERE id=? AND owner=?").bind(id,owner).run();
   return json({ok:true});
  }
  if(action==="saveSettings"){
   const c=companyValue(value);
   await database.prepare("INSERT INTO settings (owner) VALUES (?) ON CONFLICT(owner) DO NOTHING").bind(owner).run();
   await database.prepare("UPDATE settings SET business_name=?,email=?,phone=?,address=?,tax_number=?,payment_instructions=?,default_terms=?,province=?,accent_color=?,secondary_color=?,document_style=?,footer_text=?,estimate_prefix=?,invoice_prefix=?,email_subject=?,email_message=?,preferences_json=?,letterhead_json=? WHERE owner=?").bind(c.businessName,c.email,c.phone,c.address,c.taxNumber,c.paymentInstructions,c.defaultTerms,c.province,c.accentColor,c.secondaryColor,c.documentStyle,c.footerText,c.estimatePrefix,c.invoicePrefix,c.emailSubject,c.emailMessage,c.preferencesJson,c.letterheadJson,owner).run();
   return json({ok:true});
  }
  if(action==="saveProfile"){
   const name=text(value.displayName,140),title=text(value.jobTitle,140),phone=text(value.phone,80),signature=text(value.signature,1200);
   await database.prepare("INSERT INTO user_profiles (owner,display_name,job_title,phone,signature,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET display_name=excluded.display_name,job_title=excluded.job_title,phone=excluded.phone,signature=excluded.signature,updated_at=excluded.updated_at").bind(owner,name,title,phone,signature,stamp()).run();
   return json({ok:true});
  }
  if(action==="saveCatalog"){
   const kind=value.kind==="package"?"package":"item",name=text(value.name,160);if(!name)return fail("A catalog name is required.");
   const lines=kind==="package"?cleanItems(value.items).filter(i=>i.description):[];
   if(kind==="package"&&!lines.length)return fail("Add at least one line to the package.");
   const description=text(value.description,1000),unit=text(value.unit,40)||"each",price=integer(value.unitPriceCents),taxable=value.taxable!==false?1:0,key=id||crypto.randomUUID();
   if(id){const row=await database.prepare("SELECT id FROM catalog_entries WHERE id=? AND owner=?").bind(id,owner).first();if(!row)return fail("Catalog entry not found.",404);
    await database.prepare("UPDATE catalog_entries SET kind=?,name=?,description=?,unit=?,unit_price_cents=?,taxable=?,items_json=?,updated_at=? WHERE id=? AND owner=?").bind(kind,name,description,unit,price,taxable,JSON.stringify(lines),stamp(),id,owner).run();
   }else await database.prepare("INSERT INTO catalog_entries (id,owner,kind,name,description,unit,unit_price_cents,taxable,items_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(key,owner,kind,name,description,unit,price,taxable,JSON.stringify(lines),stamp(),stamp()).run();
   return json({id:key});
  }
  if(action==="deleteCatalog"){if(!id)return fail("Catalog id is required.");await database.prepare("DELETE FROM catalog_entries WHERE id=? AND owner=?").bind(id,owner).run();return json({ok:true})}
  return fail("Unknown action.");
 }catch(error){return serverError(error)}
}




