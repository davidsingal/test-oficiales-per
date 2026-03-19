"use client";

import { useCallback, useState } from "react";
import { ShareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

const ShareQuestionButton = ({ questionId }: { questionId: number }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const questionUrl = `${window.location.origin}/pregunta/${questionId}`;
    await copyToClipboard(questionUrl);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1500);
  }, [questionId]);

  return (
    <Button size="sm" variant="outline" onClick={handleShare}>
      <ShareIcon />
      {isCopied ? "Copiado" : "Compartir"}
    </Button>
  );
};

export default ShareQuestionButton;
