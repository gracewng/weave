import { redirect } from 'next/navigation';
/** Budget lives under Settings now. */
export default function BudgetRedirect() { redirect('/settings#budget'); }
