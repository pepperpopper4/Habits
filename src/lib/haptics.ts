import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function native(): boolean {
  return Capacitor.isNativePlatform();
}

export async function hapticLight() {
  if (!native()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticMedium() {
  if (!native()) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function hapticSelection() {
  if (!native()) return;
  await Haptics.selectionChanged();
}

export async function hapticSuccess() {
  if (!native()) return;
  await Haptics.notification({ type: NotificationType.Success });
}
