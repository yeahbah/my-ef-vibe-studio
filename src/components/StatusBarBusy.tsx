interface StatusBarBusyProps {
  message: string;
}

export function StatusBarBusy({ message }: StatusBarBusyProps) {
  return (
    <>
      <span className="status-busy-spinner" aria-hidden="true" />
      <span className="status-busy-message">{message}</span>
    </>
  );
}
