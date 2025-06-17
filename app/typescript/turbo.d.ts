declare module "@hotwired/turbo-rails" {
  type TurboSession = {
    drive: boolean;
  };

  type Turbo = {
    session: TurboSession;
    visit: (path: string, options?: { action?: "advance" | "replace"; frame?: string }) => void;
    renderStreamMessage: (message: string) => void;
  };

  export const Turbo: Turbo;
}
