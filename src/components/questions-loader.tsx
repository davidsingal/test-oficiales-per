const QuestionsLoader = ({ message = "Cargando preguntas..." }) => {
  return (
    <div
      className="flex items-center justify-center rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span className="mr-3 size-4 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground" />
      <span>{message}</span>
    </div>
  );
};

export default QuestionsLoader;
