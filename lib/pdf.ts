import type {Business,Client,Doc,Photo,Profile} from "@/lib/model";
import {cash,totals} from "@/lib/model";
import {transparentLogo} from "@/lib/logo";
const fmt=(date:string)=>date?new Date(date+"T12:00:00").toLocaleDateString("en-CA",{year:"numeric",month:"short",day:"numeric"}):"";
async function picture(url:string,isLogo=false):Promise<{data:string;ratio:number;format:"PNG"|"JPEG"}|null>{
 try{const res=await fetch(url,{cache:"no-store"});if(!res.ok)return null;const original=await res.blob(),blob=isLogo?await transparentLogo(original):original;const object=URL.createObjectURL(blob);try{const img=new Image();img.src=object;await img.decode();const scale=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext("2d")?.drawImage(img,0,0,canvas.width,canvas.height);return{data:canvas.toDataURL(isLogo?"image/png":"image/jpeg",.88),ratio:canvas.width/canvas.height,format:isLogo?"PNG":"JPEG"}}finally{URL.revokeObjectURL(object)}}catch{return null}
}
export async function makePdf(documentData:Doc,client:Partial<Client>|undefined,company:Business,profile:Profile,photos:Photo[]){
 const {jsPDF}=await import("jspdf"),pdf=new jsPDF({unit:"mm",format:"a4",compress:true});pdf.setProperties({title:documentData.kind.toUpperCase()+" "+documentData.number,subject:documentData.title,author:company.businessName});
 const w=210,m=17,accent=/^#[0-9a-fA-F]{6}$/.test(company.accentColor)?company.accentColor:"#183f8f",gold=/^#[0-9a-fA-F]{6}$/.test(company.secondaryColor)?company.secondaryColor:"#d8b36a",dark="#1a2938",muted="#596979";let y=22;
 const triple=(hex:string)=>{const s=hex.replace("#","");return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)] as const};
 const fill=(hex:string)=>{const [r,g,b]=triple(hex);pdf.setFillColor(r,g,b)},stroke=(hex:string)=>{const [r,g,b]=triple(hex);pdf.setDrawColor(r,g,b)},ink=(hex:string)=>{const [r,g,b]=triple(hex);pdf.setTextColor(r,g,b)};
 const text=(value:string,x:number,top:number,size=10,bold=false,max=0)=>{pdf.setFont("helvetica",bold?"bold":"normal");pdf.setFontSize(size);ink(bold?dark:muted);const lines=max?pdf.splitTextToSize(value||"",max):[value||""];pdf.text(lines,x,top);return top+lines.length*size*.42+2};
 const line=(top:number)=>{stroke("#dce3e9");pdf.setLineWidth(.25);pdf.line(m,top,w-m,top)};
 const footer=()=>{const pages=pdf.getNumberOfPages();for(let n=1;n<=pages;n++){pdf.setPage(n);line(278);text(company.footerText||company.businessName,m,284,8,false,145);text(n+" / "+pages,w-m-12,284,8)}};
 const fresh=()=>{pdf.addPage();y=21},reserve=(height:number)=>{if(y+height>269)fresh()};
 const label=(value:string,x:number,top:number)=>{pdf.setFont("helvetica","bold");pdf.setFontSize(8);ink(accent);pdf.text(value.toUpperCase(),x,top)};
 const design=company.letterhead,logo=design.showLogo&&company.logoKey?await picture("/api/company-logo",true):null;
 if(logo){const maxW={small:25,medium:36,large:48}[design.logoSize]||36,maxH=23,width=Math.min(maxW,maxH*logo.ratio),height=width/logo.ratio,position=design.logoPosition,x=position==="left"?m:position==="center"?(w-width)/2:w-m-width;pdf.addImage(logo.data,"PNG",x,15+(maxH-height)/2,width,height)}
 const titleY=logo?53:29,alignment=design.companyAlignment,x=alignment==="left"?m:alignment==="center"?w/2:w-m,headerStyle=design.headerStyle;
 if(headerStyle==="band"){fill(accent);pdf.rect(0,titleY-10,w,29,"F")}
 pdf.setFont("helvetica","bold");pdf.setFontSize(company.documentStyle==="minimal"?15:17);ink(headerStyle==="band"?"#ffffff":accent);pdf.text(company.businessName||"Company",x,titleY,{align:alignment,maxWidth:w-2*m});
 pdf.setFontSize(11);ink(headerStyle==="band"?"#ffffff":dark);pdf.text(documentData.kind.toUpperCase(),w-m,titleY+10,{align:"right"});
 if(headerStyle==="line"){fill(gold);pdf.rect(m,titleY+16,w-2*m,1.5,"F")}
 y=titleY+30;
 label("Document no.",m,y);text(documentData.number,m,y+6,11,true);label("Issued",75,y);text(fmt(documentData.issueDate),75,y+6,10);if(documentData.dueDate){label(documentData.kind==="invoice"?"Due date":"Valid until",137,y);text(fmt(documentData.dueDate),137,y+6,10)}y+=19;line(y);y+=12;
 label("From",m,y);label("Prepared for",108,y);y+=7;
 let from=y,to=y;from=text(company.businessName,m,from,10,true,78);if(company.address)from=text(company.address,m,from,9,false,78);if(company.email)from=text(company.email,m,from,9,false,78);if(company.phone)from=text(company.phone,m,from,9,false,78);if(company.taxNumber&&company.features.taxNumber)from=text("Tax no. "+company.taxNumber,m,from,9,false,78);
 to=text(client?.name||"Client",108,to,10,true,80);if(client?.company)to=text(client.company,108,to,9,false,80);if(client?.billingAddress)to=text(client.billingAddress,108,to,9,false,80);if(client?.email)to=text(client.email,108,to,9,false,80);if(client?.phone)to=text(client.phone,108,to,9,false,80);y=Math.max(from,to)+5;
 if(client?.siteAddress&&company.features.jobAddress){label("Job site",m,y);y=text(client.siteAddress,m,y+6,9,false,170)+4}
 if(documentData.title){reserve(16);y=text(documentData.title,m,y+4,15,true,170)+5}
 reserve(24);if(company.documentStyle==="minimal"){line(y+10);ink(accent)}else{fill(company.documentStyle==="modern"?dark:accent);pdf.rect(m,y,w-2*m,10,"F");ink("#ffffff")}pdf.setFont("helvetica","bold");pdf.setFontSize(8);pdf.text("DESCRIPTION",m+3,y+6.5);pdf.text("QTY / UNIT",116,y+6.5);pdf.text("RATE",155,y+6.5,{align:"right"});pdf.text("AMOUNT",w-m-3,y+6.5,{align:"right"});y+=14;
 for(const [rowIndex,row] of documentData.items.entries()){const desc=pdf.splitTextToSize(row.description||"Item",89) as string[],rh=Math.max(11,desc.length*4.5+5);reserve(rh+4);if(company.documentStyle==="modern"&&rowIndex%2===1){fill("#f1f5f7");pdf.rect(m,y-1,w-2*m,rh+2,"F")}ink(dark);pdf.setFont("helvetica","normal");pdf.setFontSize(9);pdf.text(desc,m+3,y+4);pdf.text(String(row.quantity)+" "+row.unit,116,y+4);pdf.text(cash(row.unitPriceCents),155,y+4,{align:"right"});pdf.text(cash(Math.round(row.quantity*row.unitPriceCents)),w-m-3,y+4,{align:"right"});y+=rh;if(company.documentStyle!=="minimal")line(y);y+=3}
 const total=totals(documentData);reserve(46);const right=135,sum=(name:string,value:string,bold=false)=>{pdf.setFont("helvetica",bold?"bold":"normal");pdf.setFontSize(bold?12:9);ink(bold?accent:muted);pdf.text(name,right,y);pdf.text(value,w-m,y,{align:"right"});y+=bold?9:7};
 sum("Subtotal",cash(total.subtotal));if(documentData.discountCents)sum("Discount","-"+cash(documentData.discountCents));if(total.gst){sum("GST (5%)",cash(total.gst));sum("QST (9.975%)",cash(total.qst))}else sum("Tax ("+documentData.taxRate/1000+"%)",cash(total.tax));stroke(gold);pdf.setLineWidth(.7);pdf.line(right,y,w-m,y);y+=7;sum("Total CAD",cash(total.total),true);if(documentData.depositCents)sum(documentData.kind==="invoice"?"Balance due":"After deposit",cash(total.balance),true);
 const block=(heading:string,value:string)=>{if(!value)return;const lines=pdf.splitTextToSize(value,w-2*m) as string[];reserve(lines.length*5+18);y+=5;label(heading,m,y);y=text(value,m,y+6,9,false,w-2*m)+4};block("Notes",documentData.notes);block("Terms",documentData.terms);if(documentData.kind==="invoice"&&company.features.paymentInstructions)block("Payment instructions",company.paymentInstructions);if(company.features.signature){const signature=profile.signature||[profile.displayName,profile.jobTitle,company.businessName].filter(Boolean).join(" · ");block("Prepared by",signature)}
 if(company.features.photos&&photos.length){for(const photo of photos){const image=await picture("/api/photos?id="+encodeURIComponent(photo.id));if(!image)continue;fresh();label("Job photo",m,y);y+=7;const width=w-2*m,height=Math.min(225,width/image.ratio);pdf.addImage(image.data,"JPEG",m,y,width,height);y+=height+8;text(photo.filename,m,y,9)}}
 footer();const blob=pdf.output("blob"),safe=documentData.number.replace(/[^a-zA-Z0-9_-]+/g,"-")||documentData.kind;return new File([blob],safe+".pdf",{type:"application/pdf"})
}
export function downloadPdf(file:File){const url=URL.createObjectURL(file),anchor=document.createElement("a");anchor.href=url;anchor.download=file.name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}



