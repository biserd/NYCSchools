import { WorkerEntrypoint } from 'cloudflare:workers';
import { kinderLearnerAccessUntil } from './kinderLearnerEntitlement';

// Named RPC entrypoint with no public HTTP route or write methods.
export class KinderLearnerEntitlements extends WorkerEntrypoint<Env> {
  async familyPremiumAccessUntil(verifiedEmail: string): Promise<number | null> {
    return kinderLearnerAccessUntil(this.env.DB, verifiedEmail);
  }
}
