import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OnboardingRoutineProduct } from '../../types/onboardingRoutine';
import { isRoutineProductArray } from '../../types/onboardingRoutine';
import { guessCategory } from '../../utils/productCategory';
import { addToShelf } from '../../services/products';
import { saveRoutine, type RoutineStep } from '../../services/routine';
import { ONBOARDING_ANSWERS_KEY, ONBOARDING_ROUTINE_SYNCED_KEY } from '../../constants/onboarding';

export async function getStoredOnboardingRoutine(): Promise<OnboardingRoutineProduct[]> {
  const raw = await AsyncStorage.getItem(ONBOARDING_ANSWERS_KEY);
  if (!raw) return [];
  try {
    const answers = JSON.parse(raw) as Record<string, unknown>;
    const routine = answers.currentRoutine;
    return isRoutineProductArray(routine) ? routine : [];
  } catch {
    return [];
  }
}

export async function syncOnboardingRoutineToAccount(): Promise<void> {
  const alreadySynced = await AsyncStorage.getItem(ONBOARDING_ROUTINE_SYNCED_KEY);
  if (alreadySynced === 'true') return;

  const products = await getStoredOnboardingRoutine();
  if (products.length === 0) {
    await AsyncStorage.setItem(ONBOARDING_ROUTINE_SYNCED_KEY, 'true');
    return;
  }

  const amSteps: RoutineStep[] = [];
  const pmSteps: RoutineStep[] = [];

  for (const product of products) {
    const category = guessCategory(product.name, []);
    let productId = product.shelfId ?? null;

    // Already added to shelf during onboarding — reuse that id
    if (!productId) {
      const shelfProduct = await addToShelf({
        name: product.name,
        brand: product.brand ?? null,
        barcode: null,
        ingredients: [],
        source: 'manual',
        image_url: product.imageUrl ?? null,
      });
      productId = shelfProduct.id;
    }

    const step: RoutineStep = {
      order: 0,
      product_id: productId,
      product_name: product.name,
      brand: product.brand ?? null,
      category: product.category || category,
      reason: `Used ${product.daysPerWeek}× per week during onboarding`,
    };

    if (product.period === 'morning' || product.period === 'both') {
      amSteps.push({ ...step, order: amSteps.length + 1 });
    }
    if (product.period === 'night' || product.period === 'both') {
      pmSteps.push({ ...step, order: pmSteps.length + 1 });
    }
  }

  if (amSteps.length > 0) {
    await saveRoutine('AM', amSteps);
  }
  if (pmSteps.length > 0) {
    await saveRoutine('PM', pmSteps);
  }

  await AsyncStorage.setItem(ONBOARDING_ROUTINE_SYNCED_KEY, 'true');
}
