import { Zap } from "lucide-react";

interface Props {
  displayedWord: string;
  terminalText: string | null;
}

export function JobStatusWord({ displayedWord, terminalText }: Props) {
  if (terminalText === null) {
    return (
      <div className="flex items-center gap-2 justify-center">
        <Zap />
        <p className="font-serif text-2xl text-accent leading-tight">
          {displayedWord}...
        </p>
      </div>
    );
  }
  return (
    <p className="font-serif text-2xl text-[#E8E5DC] leading-tight">
      {terminalText}
    </p>
  );
}
