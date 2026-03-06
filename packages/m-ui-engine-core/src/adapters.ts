import type { MUiEngineComponent, MUiEngineManifest, MUiEngineScreen } from "./contracts.js";

export interface MUiRenderAdapter {
  MResolveComponentType(componentType: string): string;
}

export class MDefaultUiRenderAdapter implements MUiRenderAdapter {
  private readonly mMap: Record<string, string>;

  constructor(componentMap?: Record<string, string>) {
    this.mMap = componentMap ?? {
      "page-content": "PageContent",
      "tab-content": "TabContent",
      panel: "Panel"
    };
  }

  public MResolveComponentType(componentType: string): string {
    return this.mMap[componentType] ?? componentType;
  }
}

export interface MUiRenderPlanItem {
  componentKey: string;
  slot: string;
  order: number;
  resolvedComponentType: string;
  customElementTag?: string;
  props: Record<string, string>;
}

export interface MUiLayoutAreaPlan {
  areaKey: string;
  purpose: string;
  order: number;
}

export interface MUiSlottedRenderPlan {
  layoutTemplate: string;
  areas: MUiLayoutAreaPlan[];
  bySlot: Record<string, MUiRenderPlanItem[]>;
  all: MUiRenderPlanItem[];
}

export function MBuildRenderPlan(
  screen: MUiEngineScreen,
  adapter: MUiRenderAdapter,
  manifest?: MUiEngineManifest
): MUiRenderPlanItem[] {
  return screen.components
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((component: MUiEngineComponent) => MMapRenderPlanItem(component, adapter, manifest));
}

export async function MBuildRenderPlanAsync(
  screen: MUiEngineScreen,
  adapter: MUiRenderAdapter,
  manifest?: MUiEngineManifest
): Promise<MUiRenderPlanItem[]> {
  const components = screen.components.slice().sort((left, right) => left.order - right.order);
  const items = await Promise.all(
    components.map(async (component) =>
      MMapRenderPlanItem(component, adapter, manifest, await MResolveComponentTypeWithRegistry(component.componentType, adapter, manifest))
    )
  );

  return items;
}

export function MGroupRenderPlanBySlot(items: MUiRenderPlanItem[]): Record<string, MUiRenderPlanItem[]> {
  const grouped: Record<string, MUiRenderPlanItem[]> = {};
  for (const item of items) {
    if (!grouped[item.slot]) {
      grouped[item.slot] = [];
    }

    grouped[item.slot].push(item);
  }

  for (const slot of Object.keys(grouped)) {
    grouped[slot] = grouped[slot].sort((left, right) => left.order - right.order);
  }

  return grouped;
}

export function MBuildSlottedRenderPlan(
  screen: MUiEngineScreen,
  adapter: MUiRenderAdapter,
  manifest?: MUiEngineManifest
): MUiSlottedRenderPlan {
  const all = MBuildRenderPlan(screen, adapter, manifest);
  return MBuildSlottedRenderPlanFromItems(screen, all);
}

export async function MBuildSlottedRenderPlanAsync(
  screen: MUiEngineScreen,
  adapter: MUiRenderAdapter,
  manifest?: MUiEngineManifest
): Promise<MUiSlottedRenderPlan> {
  const all = await MBuildRenderPlanAsync(screen, adapter, manifest);
  return MBuildSlottedRenderPlanFromItems(screen, all);
}

export async function MResolveComponentTypeWithRegistry(
  componentType: string,
  adapter: MUiRenderAdapter,
  manifest?: MUiEngineManifest
): Promise<string> {
  const resolved = adapter.MResolveComponentType(componentType);
  if (resolved !== componentType) {
    return resolved;
  }

  const descriptor = manifest?.componentRegistry?.components?.[componentType];
  if (!descriptor?.bundleUrl) {
    return componentType;
  }

  await MLoadRegistryBundle(descriptor.bundleUrl);
  const tag = MResolveCustomElementTag(componentType, descriptor.customElementTag);

  if (typeof customElements !== "undefined") {
    await customElements.whenDefined(tag).catch(() => undefined);
  }

  return tag;
}

function MMapRenderPlanItem(
  component: MUiEngineComponent,
  adapter: MUiRenderAdapter,
  manifest: MUiEngineManifest | undefined,
  resolvedOverride?: string
): MUiRenderPlanItem {
  const resolved =
    resolvedOverride ??
    MResolveComponentTypeFromRegistrySync(component.componentType, adapter, manifest) ??
    adapter.MResolveComponentType(component.componentType);

  return {
    componentKey: component.componentKey,
    slot: component.slot,
    order: component.order,
    resolvedComponentType: resolved,
    customElementTag: resolved.startsWith("mu-") ? resolved : undefined,
    props: component.props
  };
}

function MResolveComponentTypeFromRegistrySync(
  componentType: string,
  adapter: MUiRenderAdapter,
  manifest?: MUiEngineManifest
): string | undefined {
  const resolved = adapter.MResolveComponentType(componentType);
  if (resolved !== componentType) {
    return resolved;
  }

  const descriptor = manifest?.componentRegistry?.components?.[componentType];
  if (!descriptor?.bundleUrl) {
    return undefined;
  }

  // Synchronous path assumes the host preloaded registry bundles.
  return MResolveCustomElementTag(componentType, descriptor.customElementTag);
}

const mLoadedBundles = new Map<string, Promise<unknown>>();

async function MLoadRegistryBundle(bundleUrl: string): Promise<void> {
  if (!mLoadedBundles.has(bundleUrl)) {
    const loader = import(/* @vite-ignore */ bundleUrl).catch((error: unknown) => {
      mLoadedBundles.delete(bundleUrl);
      throw error;
    });

    mLoadedBundles.set(bundleUrl, loader);
  }

  await mLoadedBundles.get(bundleUrl);
}

function MToCustomElementTag(componentType: string): string {
  return `mu-${componentType}`;
}

function MResolveCustomElementTag(componentType: string, customElementTag?: string | null): string {
  const candidate = customElementTag?.trim();
  if (!candidate) {
    return MToCustomElementTag(componentType);
  }

  return candidate;
}

function MBuildSlottedRenderPlanFromItems(screen: MUiEngineScreen, all: MUiRenderPlanItem[]): MUiSlottedRenderPlan {
  const areas = screen.layout.areas
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((area) => ({
      areaKey: area.areaKey,
      purpose: area.purpose,
      order: area.order
    }));

  const bySlot = MGroupRenderPlanBySlot(all);
  for (const area of areas) {
    if (!bySlot[area.areaKey]) {
      bySlot[area.areaKey] = [];
    }
  }

  return {
    layoutTemplate: screen.layout.template,
    areas,
    bySlot,
    all
  };
}
