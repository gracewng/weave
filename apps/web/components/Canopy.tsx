/* Backdrop behind the app and onboarding: the lead's sun-printed leaf cloth (public/canopy.jpg) over a green gradient.
   The image is set inline so it never depends on how the CSS bundler resolves url(). */
export function Canopy(_: { count?: number; seed?: number } = {}) {
  return <div className="canopy" aria-hidden="true" style={{ backgroundImage: "url('/canopy.jpg')" }} />;
}
