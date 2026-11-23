"use client";
import { useState } from "react";
import { saveProduct, advanceOrder } from "@/app/admin/actions";
import { CATEGORIES } from "@/lib/categories";

export function ProductForm() {
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
 return <form className="space-y-4 border border-gold/30 bg-white p-6" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage("");const f=new FormData(e.currentTarget);const id=String(f.get("id"));try{const r=await saveProduct({id,slug:id,name:f.get("name"),category:f.get("category"),images:[f.get("image")],shortDescription:f.get("summary"),description:f.get("description"),ingredients:f.get("ingredients"),storage:f.get("storage"),featured:f.has("featured"),bestSeller:false,active:f.has("active"),isSample:false,variants:[{id:id+"-pack",label:f.get("label"),grams:Number(f.get("grams")),price:Number(f.get("price")),stock:Number(f.get("stock"))}]});setMessage(r.message);}catch{setMessage("Could not save. Please retry.");}finally{setBusy(false);}}}>
 <h2 className="text-2xl">Create a product</h2><p>Enter verified business prices and inventory. Each product starts with one pack size.</p>
 {[["id","Unique ID / URL slug","text"],["name","Product name","text"],["summary","Short description","text"],["ingredients","Ingredients and allergens","text"],["storage","Storage instructions","text"],["label","Pack label (e.g. 250g)","text"],["grams","Weight in grams","number"],["price","Price in PKR","number"],["stock","Available packs","number"]].map(([name,label,type])=><label key={name} className="block text-sm">{label}<input name={name} type={type} required min={name==="price"?"0.01":"0"} step={name==="price"?"0.01":undefined} pattern={name==="id"?"[a-z0-9-]+":undefined} className="input mt-1" /></label>)}
 <label className="block text-sm">Description<textarea required name="description" minLength={20} className="input" /></label>
 <label className="block text-sm">Category<select name="category" className="input">{CATEGORIES.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
 <label className="block text-sm">Photo<select name="image" className="input">{CATEGORIES.map(c=><option key={c.slug} value={c.image}>{c.name}</option>)}</select></label>
 <label className="block"><input type="checkbox" name="featured" /> Featured product</label><label className="block"><input type="checkbox" name="active" /> Publish and allow orders</label>
 <button disabled={busy} className="btn-navy">{busy?"Saving...":"Create product"}</button><p role="status">{message}</p></form>;
}
export function OrderButton({id,status}:{id:string;status:string}) {
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const labels:Record<string,string>={pending:"Confirm order",confirmed:"Mark shipped",shipped:"Mark delivered"};
 return <div>{labels[status]&&<button disabled={busy} className="btn-navy mt-3" onClick={async()=>{setBusy(true);try{setMessage((await advanceOrder(id,status)).message);}catch{setMessage("Update failed. Retry.");}finally{setBusy(false);}}}>{busy?"Updating...":labels[status]}</button>}<p role="status">{message}</p></div>;
}
