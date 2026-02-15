import type { Message } from "../core/types";

export class MessageLog {
  private readonly max: number;
  private readonly items: Message[];

  public constructor(max: number) {
    this.max = max;
    this.items = [];
  }

  public push(text: string): void {
    this.items.unshift({ text, t: Date.now() });
    while (this.items.length > this.max) this.items.pop();
  }

  public all(): Message[] {
    return [...this.items];
  }
}
