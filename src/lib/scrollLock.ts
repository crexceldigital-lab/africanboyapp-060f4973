// Shared, reference-counted body scroll lock.
// Multiple overlays (product modal + fullscreen lightbox) can lock at once;
// scrolling is only restored once every one of them has released its lock.

let lockCount = 0;
let previousOverflow: string | null = null;

export function lockBodyScroll(): void {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow ?? '';
    previousOverflow = null;
  }
}
