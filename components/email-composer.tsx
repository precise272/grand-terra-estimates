"use client";
import {useEffect,useState} from "react";
import {Download,ExternalLink,Mail,Share2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Dialog,DialogContent,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {Field} from "@/components/doc-editor";
import {Business,Client,Doc,Photo,Profile,cash,totals} from "@/lib/model";
import {downloadPdf,makePdf} from "@/lib/pdf";
const apply=(template:string,doc:Doc,client:Partial<Client>|undefined,company:Business)=>template.replace(/\{(number|client|company|total|kind|project)\}/gi,(_,key:string)=>({number:doc.number,client:client?.name||"client",company:company.businessName,total:cash(totals(doc).total),kind:doc.kind,project:doc.title||"your project"}[key.toLowerCase()]||""));
export default function EmailComposer({doc,client,company,profile,photos,onClose,onNotice,onError}:{doc:Doc;client?:Partial<Client>;company:Business;profile:Profile;photos:Photo[];onClose:()=>void;onNotice:(s:string)=>void;onError:(s:string)=>void}){
 const kind=doc.kind;
 const [to,setTo]=useState(client?.email||""),[subject,setSubject]=useState(apply(company.emailSubject||"{company} {kind} {number}",doc,client,company));
 const signature=company.features.signature?(profile.signature||[profile.displayName,profile.jobTitle,company.businessName,profile.phone||company.phone].filter(Boolean).join("\n")):"";
 const [message,setMessage]=useState(apply(company.emailMessage||"Hello {client},\n\nPlease find your {kind} for {project} attached. Let me know if you have any questions.\n\nBest regards,",doc,client,company)+(signature?"\n"+signature:""));
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;makePdf(doc,client,company,profile,photos.filter(p=>p.documentId===doc.id)).then(f=>{if(active){setFile(f);setLoading(false)}}).catch(e=>{if(active){setLoading(false);onError((e as Error).message)}});return()=>{active=false}},[doc,client,company,profile,photos,onError]);
 useEffect(()=>{if(!file)return;const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 const mailto="mailto:"+encodeURIComponent(to)+"?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(message);
 function draft(){if(!file)return;downloadPdf(file);const link=document.createElement("a");link.href=mailto;link.click();onNotice("Email draft opened. Attach the downloaded PDF before sending.")}
 async function share(){
  if(!file)return;
  if(typeof navigator.share==="function"&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title:subject,text:message});onNotice("Share sheet opened with PDF attached.");return}catch(e){if((e as Error).name==="AbortError")return}}
  draft();
 }
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="email-dialog"><DialogHeader><DialogTitle>Review & share {kind}</DialogTitle></DialogHeader><p className="panel-copy">Review the PDF and message. The email opens in your chosen mail app; you decide when to send.</p><div className="email-grid"><div className="email-fields"><Field label="To"><Input type="email" value={to} onChange={e=>setTo(e.target.value)} placeholder="client@example.ca"/></Field><Field label="Subject"><Input value={subject} onChange={e=>setSubject(e.target.value)}/></Field><Field label="Message"><Textarea value={message} onChange={e=>setMessage(e.target.value)} rows={12}/></Field><div className="email-attachment"><Mail size={17}/><span>{loading?"Preparing PDF…":file?.name||"PDF unavailable"}</span></div><div className="email-actions"><Button className="primary-button" disabled={!file||!to} onClick={draft}><Mail size={17}/> Open email draft</Button><Button variant="outline" disabled={!file} onClick={share}><Share2 size={17}/> Share attached PDF</Button><Button variant="outline" disabled={!file} onClick={()=>file&&downloadPdf(file)}><Download size={17}/> Download PDF</Button></div><small className="email-note">Email drafts have the recipient, subject, and message filled in. Attach the downloaded PDF before sending. On supported devices, “Share attached PDF” includes the file in the share sheet.</small></div><div className="email-preview">{preview?<iframe title="PDF preview" src={preview}/>:<div>{loading?"Preparing preview…":"Preview unavailable"}</div>}</div></div></DialogContent></Dialog>;
}




