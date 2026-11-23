"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { CATEGORIES } from "@/lib/categories";
const productSchema=z.object({
 id:z.string().regex(/^[a-z0-9-]{1,100}$/),slug:z.string().regex(/^[a-z0-9-]{1,100}$/),name:z.string().trim().min(2).max(150),category:z.string().refine(v=>CATEGORIES.some(c=>c.slug===v)),
 images:z.array(z.string().refine(v=>CATEGORIES.some(c=>c.image===v))).min(1).max(8),
 shortDescription:z.string().trim().min(10).max(300),description:z.string().trim().min(20).max(5000),ingredients:z.string().trim().min(3).max(2000),storage:z.string().trim().min(3).max(2000),
 featured:z.boolean(),bestSeller:z.boolean(),active:z.boolean(),isSample:z.boolean(),
 variants:z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9-]{1,100}$/),label:z.string().min(1).max(60),grams:z.number().int().nonnegative(),price:z.number().positive().max(1000000),stock:z.number().int().nonnegative().max(1000000)})).min(1).max(20)
}).refine(p=>new Set(p.variants.map(v=>v.id)).size===p.variants.length,"Variant IDs must be unique.");
export async function saveProduct(raw:unknown) {
 try {
 const db=await requireAdmin();const parsed=productSchema.safeParse(raw);
 if(!parsed.success)return {ok:false,message:parsed.error.issues[0].message};
 const p=parsed.data;
 const {error}=await db.from("products").insert({id:p.id,active:p.active,data:p});
 if(error)return {ok:false,message:error.code==="23505"?"Product ID already exists. Choose a unique ID.":"Product could not be saved."};
 revalidatePath("/","layout");return {ok:true,message:"Product created successfully."};
 }catch{return {ok:false,message:"Administrator access or server configuration is missing."};}
}
export async function advanceOrder(id:string,previous:string) {
 try {
 const db=await requireAdmin();const next:Record<string,string>={pending:"confirmed",confirmed:"shipped",shipped:"delivered"};
 if(!z.uuid().safeParse(id).success||!next[previous])return {ok:false,message:"Invalid order transition."};
 const {data,error}=await db.from("orders").update({status:next[previous]}).eq("id",id).eq("status",previous).select("id");
 if(error||!data?.length)return {ok:false,message:"Order changed or update failed. Refresh and retry."};
 revalidatePath("/admin");revalidatePath("/account");return {ok:true,message:`Order marked ${next[previous]}.`};
 }catch{return {ok:false,message:"Administrator access required."};}
}
