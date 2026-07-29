import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type ScreenHeaderProps = {
  title: string;
  backTo?: string;
};

export default function ScreenHeader({ title, backTo }: ScreenHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate(-1);
  };

  return (
    <header className="grid min-h-12 grid-cols-[48px_1fr_48px] items-center">
      <button
        type="button"
        onClick={handleBack}
        className="flex h-11 w-11 items-center justify-center rounded-full text-black hover:bg-light-grey/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
        aria-label="Go back"
      >
        <ChevronLeft className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      </button>
      <h1 className="text-center text-lg font-semibold leading-tight text-black">{title}</h1>
      <span aria-hidden="true" />
    </header>
  );
}
