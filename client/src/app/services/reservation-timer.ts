import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReservationTimerService {
  private readonly deadlineKey = 'booking_timer_deadline';
  private sub?: Subscription;

  private remainingSecondsSubject = new BehaviorSubject<number>(0);
  private expiredSubject = new BehaviorSubject<boolean>(false);

  // Public streams
  remainingSeconds$ = this.remainingSecondsSubject.asObservable();
  expired$ = this.expiredSubject.asObservable();

  /** Ensure the timer is running. If a valid deadline exists, it will be reused. */
  ensureStarted(durationSeconds = 15 * 60) {
    const now = Date.now();
    let deadline = this.getDeadline();

    if (!deadline || deadline <= now) {
      deadline = now + durationSeconds * 1000;
      localStorage.setItem(this.deadlineKey, String(deadline));
    }

    this.startTicking(deadline);
  }

  /** Reset and stop the timer, clearing the stored deadline. */
  reset() {
    localStorage.removeItem(this.deadlineKey);
    this.stop();
    this.remainingSecondsSubject.next(0);
    this.expiredSubject.next(false);
  }

  /** Read deadline from storage. */
  getDeadline(): number | null {
    const v = localStorage.getItem(this.deadlineKey);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private startTicking(deadline: number) {
    this.stop();
    // Emit immediately, then every second
    this.tick(deadline);
    this.sub = interval(1000).subscribe(() => this.tick(deadline));
  }

  private tick(deadline: number) {
    const now = Date.now();
    const sec = Math.max(0, Math.floor((deadline - now) / 1000));
    this.remainingSecondsSubject.next(sec);
    if (sec <= 0) {
      this.expiredSubject.next(true);
      this.stop();
    }
  }

  private stop() {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = undefined;
    }
  }
}
