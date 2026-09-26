/** Remove a solid background connected to the image edge, preserving interior light artwork. */
export function eraseSolidBackground(data:Uint8ClampedArray,width:number,height:number){
 const count=width*height,corners=[0,width-1,(height-1)*width,count-1];let transparent=0;for(let i=3;i<data.length;i+=4)if(data[i]<245)transparent++;
 if(transparent>0)return {removed:0,alreadyTransparent:true};
 const base=[0,1,2].map(channel=>Math.round(corners.reduce((sum,index)=>sum+data[index*4+channel],0)/4));
 const distance=(index:number)=>Math.max(Math.abs(data[index*4]-base[0]),Math.abs(data[index*4+1]-base[1]),Math.abs(data[index*4+2]-base[2]));
 if(corners.some(index=>distance(index)>34))throw new Error("This logo has a complex background. Use a transparent PNG or a logo on one solid colour.");
 const visited=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0;
 const push=(index:number)=>{if(index<0||index>=count||visited[index]||distance(index)>55)return;visited[index]=1;queue[tail++]=index};
 for(let x=0;x<width;x++){push(x);push((height-1)*width+x)}for(let y=0;y<height;y++){push(y*width);push(y*width+width-1)}
 while(head<tail){const index=queue[head++],x=index%width;data[index*4+3]=0;if(x>0)push(index-1);if(x<width-1)push(index+1);if(index>=width)push(index-width);if(index<count-width)push(index+width)}
 if(tail<count*.005)throw new Error("No removable solid background was found. Upload a transparent PNG.");
 for(let index=0;index<count;index++){if(visited[index]||distance(index)>85)continue;const x=index%width;const adjacent=(x>0&&visited[index-1])||(x<width-1&&visited[index+1])||(index>=width&&visited[index-width])||(index<count-width&&visited[index+width]);if(adjacent)data[index*4+3]=Math.min(255,Math.max(0,Math.round((distance(index)-45)*6)))}
 return {removed:tail,alreadyTransparent:false}
}
export async function transparentLogo(source:Blob):Promise<Blob>{
 const image=await createImageBitmap(source);try{const scale=Math.min(1,1400/Math.max(image.width,image.height)),width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale)),canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("Your browser could not process this logo.");ctx.drawImage(image,0,0,width,height);const frame=ctx.getImageData(0,0,width,height);eraseSolidBackground(frame.data,width,height);ctx.putImageData(frame,0,0);return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not save the transparent logo.")),"image/png"))}finally{image.close()}
}
export async function logoFile(file:File){const png=await transparentLogo(file);return new File([png],file.name.replace(/\.[^.]+$/,"")+".png",{type:"image/png"})}
