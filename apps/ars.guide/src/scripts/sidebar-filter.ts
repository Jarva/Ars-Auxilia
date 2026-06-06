const STORAGE_KEY = "ars-guide:ns-filter";

interface NamespaceInfo {
  id: string;
  text: string;
  color: string;
  pinned?: boolean;
}

type FilterState = Record<string, boolean>;

function readState(): FilterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(state: FilterState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable
  }
}

function applyFilter(root: Element, state: FilterState): void {
  // Show/hide leaf entries
  const leaves = root.querySelectorAll<HTMLElement>("[data-namespace]");
  for (const leaf of leaves) {
    const ns = leaf.getAttribute("data-namespace")!;
    leaf.style.display = state[ns] === false ? "none" : "";
  }

  // Hide intermediate <li> parents that have no visible descendants
  const innerLists = root.querySelectorAll<HTMLElement>(
    ".btn-toggle-nav li:not([data-namespace]):not([data-sidebar-section])",
  );
  for (const li of innerLists) {
    const hasVisible = li.querySelector<HTMLElement>(
      '[data-namespace]:not([style*="display: none"])',
    );
    li.style.display = hasVisible ? "" : "none";
  }

  // Hide sections where all descendants are filtered out
  const sections = root.querySelectorAll<HTMLElement>("[data-sidebar-section]");
  for (const section of sections) {
    const hasVisible = section.querySelector<HTMLElement>(
      '[data-namespace]:not([style*="display: none"])',
    );
    section.style.display = hasVisible ? "" : "none";
  }
}

function getDisabledCount(
  namespaces: NamespaceInfo[],
  state: FilterState,
): number {
  return namespaces.filter((ns) => !ns.pinned && state[ns.id] === false).length;
}

function updateTriggerLabel(
  trigger: HTMLButtonElement,
  namespaces: NamespaceInfo[],
  state: FilterState,
): void {
  const toggleable = namespaces.filter((ns) => !ns.pinned);
  const disabledCount = getDisabledCount(namespaces, state);
  const enabledCount = toggleable.length - disabledCount;

  if (disabledCount === 0) {
    trigger.textContent = "All mods";
  } else {
    trigger.textContent = `${enabledCount} of ${toggleable.length} mods`;
  }
}

function broadcastState(
  namespaces: NamespaceInfo[],
  state: FilterState,
): void {
  saveState(state);
  for (const c of document.querySelectorAll<HTMLElement>(
    ".sidebar-ns-filter",
  )) {
    // Sync checkboxes
    const checkboxes = c.querySelectorAll<HTMLInputElement>(
      ".sidebar-ns-option input[type=checkbox]",
    );
    for (const cb of checkboxes) {
      const nsId = cb.getAttribute("data-ns-id");
      if (nsId) cb.checked = state[nsId] !== false;
    }

    // Sync trigger label
    const trigger = c.querySelector<HTMLButtonElement>(".sidebar-ns-trigger");
    if (trigger) updateTriggerLabel(trigger, namespaces, state);

    // Apply filter to sidebar
    const root =
      c.closest("nav")?.querySelector(".collapsible-sidebar") ??
      c.parentElement;
    if (root) applyFilter(root, state);
  }
}

function initFilter(container: HTMLElement): void {
  const raw = container.getAttribute("data-namespaces");
  if (!raw) return;

  let namespaces: NamespaceInfo[];
  try {
    namespaces = JSON.parse(raw);
  } catch {
    return;
  }

  const toggleable = namespaces.filter((ns) => !ns.pinned);

  // Skip rendering if nothing to toggle
  if (toggleable.length === 0) return;

  // Build state — pinned namespaces are always enabled
  const saved = readState();
  const state: FilterState = {};
  for (const ns of namespaces) {
    state[ns.id] = ns.pinned ? true : saved[ns.id] !== false;
  }

  const sidebarRoot =
    container.closest("nav")?.querySelector(".collapsible-sidebar") ??
    container.parentElement;
  if (!sidebarRoot) return;

  // Build dropdown trigger button
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "sidebar-ns-trigger";
  updateTriggerLabel(trigger, namespaces, state);

  // Build dropdown panel
  const panel = document.createElement("div");
  panel.className = "sidebar-ns-panel";
  panel.hidden = true;

  for (const ns of toggleable) {
    const label = document.createElement("label");
    label.className = "sidebar-ns-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state[ns.id] !== false;
    checkbox.setAttribute("data-ns-id", ns.id);

    const swatch = document.createElement("span");
    swatch.className = "sidebar-ns-swatch";
    swatch.style.backgroundColor = ns.color;

    const text = document.createTextNode(ns.text);

    label.append(checkbox, swatch, text);

    checkbox.addEventListener("change", () => {
      state[ns.id] = checkbox.checked;
      broadcastState(namespaces, state);
    });

    panel.appendChild(label);
  }

  container.append(trigger, panel);

  // Toggle dropdown
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = !panel.hidden;
    closeAllPanels();
    if (!isOpen) {
      panel.hidden = false;
      trigger.classList.add("sidebar-ns-trigger--open");
    }
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target as Node)) {
      panel.hidden = true;
      trigger.classList.remove("sidebar-ns-trigger--open");
    }
  });

  // Apply initial filter
  applyFilter(sidebarRoot, state);
}

function closeAllPanels(): void {
  for (const p of document.querySelectorAll<HTMLElement>(".sidebar-ns-panel")) {
    p.hidden = true;
  }
  for (const t of document.querySelectorAll<HTMLElement>(
    ".sidebar-ns-trigger",
  )) {
    t.classList.remove("sidebar-ns-trigger--open");
  }
}

function init(): void {
  const containers = document.querySelectorAll<HTMLElement>(
    ".sidebar-ns-filter",
  );
  for (const container of containers) {
    initFilter(container);
  }

  // Remove FOUC-prevention style
  document
    .querySelectorAll("style[data-ns-fouc-style]")
    .forEach((el) => el.remove());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
