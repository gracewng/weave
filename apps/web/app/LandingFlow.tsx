"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Stage } from "@/components/onboarding/Stage";
import type { Block } from "@/components/three/receiptTexture";

const ReceiptPrinter3D = dynamic(
	() => import("@/components/three/ReceiptPrinter3D").then(m => m.ReceiptPrinter3D),
	{ ssr: false }
);

const INTRO: Block[] = [
	{ t: "logo" },
	{ t: "title", text: "A sustainable bank statement for your closet" },
	{ t: "rule" },
	{ t: "line", label: "Wardrobe rebuilt from receipts", value: "✓" },
	{ t: "line", label: "Before you buy: own › borrow › used", value: "✓" },
	{ t: "line", label: "The clothes you almost owned", value: "✓" },
	{ t: "rule" },
	{ t: "space", h: 200 }
];
const SIGNIN: Block[] = [
	{ t: "title", text: "Before we read anything" },
	{ t: "rule" },
	{ t: "line", label: "Gmail", value: "read-only" },
	{ t: "line", label: "Kept from emails", value: "item · price · size · date" },
	{ t: "line", label: "Friends see prices", value: "never" },
	{ t: "rule" },
	{ t: "space", h: 240 }
];

export function LandingFlow({
	signinHref,
	configured,
	error
}: {
	signinHref: string;
	configured: boolean;
	error: string | null;
}) {
	const [stage, setStage] = useState<"intro" | "signin">("intro");
	const sections = useMemo(() => (stage === "intro" ? [INTRO] : [INTRO, SIGNIN]), [stage]);
	const overlay = (
		<Stage id={stage}>
			{stage === "intro" ? (
				<button className="btn btn-ink w-full" onClick={() => setStage("signin")}>
					Get started
				</button>
			) : (
				<div className="space-y-2 text-center">
					{configured ? (
						<Link href={signinHref} className="btn btn-ink block w-full">
							Continue with Google
						</Link>
					) : (
						<div className="mono text-xs text-warn">Supabase env not configured.</div>
					)}
					{error && <div className="mono text-xs text-warn">Sign-in failed: {error}</div>}
				</div>
			)}
		</Stage>
	);
	return (
		<ReceiptPrinter3D sections={sections} duration={stage === "intro" ? 1.8 : 1.1} overlay={overlay} />
	);
}
