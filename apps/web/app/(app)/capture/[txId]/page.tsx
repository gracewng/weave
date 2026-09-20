import { redirect } from 'next/navigation';
/** Capture moved into the charge's "Add purchase details" form. */
export default async function CaptureRedirect({ params }: { params: Promise<{ txId: string }> }) {
  const { txId } = await params;
  redirect(`/charges/${txId}/add`);
}
