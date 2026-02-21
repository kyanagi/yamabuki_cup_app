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

declare module "@hotwired/turbo" {
  type StreamActions = {
    after: () => void;
    append: () => void;
    before: () => void;
    prepend: () => void;
    remove: () => void;
    replace: () => void;
    update: () => void;
    refresh: () => void;

    replace_question: () => void;
    exit_paper_seed_plates: () => void;
  };

  export const StreamActions: StreamActions;
}
