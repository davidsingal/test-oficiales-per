const Loading = () => {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl items-center justify-center px-4 py-6">
      <div
        className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-foreground" />
        <span>Cargando página...</span>
      </div>
    </main>
  );
};

export default Loading;
