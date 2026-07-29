import { ShieldCheck } from 'lucide-react';

export default function SecurityFooter() {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-dark-grey">
      <ShieldCheck className="h-4 w-4 text-black" strokeWidth={1.5} aria-hidden="true" />
      <span>Secure&nbsp; • &nbsp;Reliable&nbsp; • &nbsp;Accurate</span>
    </div>
  );
}
