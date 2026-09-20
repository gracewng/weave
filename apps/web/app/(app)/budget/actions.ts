'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';

export async function saveBudget(formData: FormData) {
  const { supabase, user } = await requireUser();
  const income = Number(String(formData.get('income') ?? '').replace(/[^0-9.]/g, ''));
  const pct = Number(formData.get('pct') ?? 5);
  const override = String(formData.get('override') ?? '').replace(/[^0-9.]/g, '');
  await supabase.from('budgets').upsert({
    user_id: user.id,
    monthly_income_cents: Number.isFinite(income) && income > 0 ? Math.round(income * 100) : null,
    clothing_pct: Number.isFinite(pct) && pct > 0 && pct <= 50 ? pct : 5,
    envelope_override_cents: override ? Math.round(Number(override) * 100) : null,
    updated_at: new Date().toISOString(),
  });
  revalidatePath('/budget'); revalidatePath('/statement'); revalidatePath('/search');
}
