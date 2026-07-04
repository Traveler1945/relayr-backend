// Developed by Traveler1945

export type PaySession = {
  reference: string;
  operatorId: string;
  actionId: string;
  amountUsdc: number;
  recipient: string;
  transferFields: {
    recipient: string;
    amount: number;
    splToken: string;
    reference: string;
  };
  createdAt: number;
};

const sessions = new Map<string, PaySession>();

export function savePaySession(session: PaySession): void {
  sessions.set(session.reference, session);
}

export function getPaySession(reference: string): PaySession | undefined {
  return sessions.get(reference);
}

export function deletePaySession(reference: string): void {
  sessions.delete(reference);
}

export function __resetPaySessionsForTests(): void {
  sessions.clear();
}
