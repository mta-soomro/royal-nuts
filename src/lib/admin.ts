import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseSessionClient } from "./supabase/session";
import { supabaseUrl } from "./supabase/config";
export async function requireAdmin() {
 const session = await getSupabaseSessionClient();
 const { data: { user } } = await session.auth.getUser();
 const allowed = (process.env.ADMIN_USER_IDS ?? "").split(",").map(s=>s.trim()).filter(Boolean);
 if (!user?.email_confirmed_at || !allowed.includes(user.id)) throw new Error("Administrator access required.");
 const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!key) throw new Error("Configure the server-only Supabase admin key.");
 return createClient(supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
