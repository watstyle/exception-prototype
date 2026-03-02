import {
  GT_CLOSE_DETAIL,
  GT_OPEN_DETAIL,
  GROUNDTRUTH_CATEGORY,
  createSetContextMessage,
  parseGroundtruthMessage
} from "@groundtruth/contracts";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  FAVORITES_SECTIONS,
  HOST_OWNED_CONTENT,
  IFRAME_ORIGIN,
  TASK_CATEGORIES,
  TASK_COUNTS
} from "./constants";
import { hostReducer, initialHostState, isGroundtruthCategory } from "./state";

export function App() {
  const [state, dispatch] = useReducer(hostReducer, undefined, initialHostState);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const listIframeRef = useRef<HTMLIFrameElement | null>(null);

  const isGroundtruthSelected = isGroundtruthCategory(state.selectedCategory);

  const detailIframeSrc = useMemo(() => {
    if (!state.detailItemId) {
      return "";
    }

    return `${IFRAME_ORIGIN}/detail/${encodeURIComponent(state.detailItemId)}`;
  }, [state.detailItemId]);

  useEffect(() => {
    const handler = (event: MessageEvent<unknown>) => {
      if (event.origin !== IFRAME_ORIGIN) {
        return;
      }

      const message = parseGroundtruthMessage(event.data);
      if (!message) {
        return;
      }

      if (message.type === GT_OPEN_DETAIL) {
        dispatch({ type: "OPEN_DETAIL", itemId: message.payload.itemId });
        return;
      }

      if (message.type === GT_CLOSE_DETAIL) {
        dispatch({ type: "CLOSE_DETAIL" });
      }
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, []);

  useEffect(() => {
    if (!isGroundtruthSelected || !iframeLoaded || !listIframeRef.current?.contentWindow) {
      return;
    }

    listIframeRef.current.contentWindow.postMessage(createSetContextMessage(GROUNDTRUTH_CATEGORY), IFRAME_ORIGIN);
  }, [iframeLoaded, iframeKey, isGroundtruthSelected]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (state.detailItemId) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [state.detailItemId]);

  function handleCategoryClick(category: string) {
    dispatch({ type: "SELECT_CATEGORY", category });
  }

  function handleRetry() {
    setIframeError(false);
    setIframeLoaded(false);
    setIframeKey((key) => key + 1);
  }

  function renderTaskContent() {
    if (!isGroundtruthSelected) {
      return (
        <section
          className="h-full rounded-r-lg border-l border-host-border bg-white p-6 shadow-inner"
          data-testid="host-native-pane"
        >
          <h2 className="text-xl font-semibold text-host-text">{state.selectedCategory}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {HOST_OWNED_CONTENT[state.selectedCategory as keyof typeof HOST_OWNED_CONTENT] ??
              "Host-owned module content placeholder."}
          </p>
          <div className="mt-6 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            This area simulates host-managed content that replaces Groundtruth when another task category is selected.
          </div>
        </section>
      );
    }

    if (iframeError) {
      return (
        <section className="h-full rounded-r-lg border-l border-rose-300 bg-rose-50 p-6" data-testid="iframe-error-pane">
          <h2 className="text-lg font-semibold text-rose-700">Groundtruth iframe failed to load</h2>
          <p className="mt-2 text-sm text-rose-600">Please retry the iframe integration experience.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white"
          >
            Retry iframe
          </button>
        </section>
      );
    }

    return (
      <section className="h-full overflow-hidden rounded-r-lg border-l border-host-border bg-white" data-testid="groundtruth-pane">
        <iframe
          key={iframeKey}
          ref={listIframeRef}
          title="Groundtruth List Iframe"
          src={`${IFRAME_ORIGIN}/list`}
          onLoad={() => {
            setIframeLoaded(true);
            setIframeError(false);
          }}
          onError={() => {
            setIframeError(true);
          }}
          className="block h-full min-h-[500px] w-full"
          data-testid="groundtruth-list-iframe"
        />
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f4f7] text-host-text">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-host-border bg-white px-5">
        <div className="flex items-center gap-3">
          <button type="button" className="rounded border border-host-border px-2 py-1 text-xs text-slate-700">
            MENU
          </button>
          <div className="rounded border border-slate-300 bg-amber-100 px-3 py-1 text-xs font-semibold tracking-wide">
            CLIENT
          </div>
          <h1 className="text-[42px] font-light leading-none text-sky-700">360</h1>
        </div>

        <div className="hidden items-center gap-4 xl:flex">
          <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs font-medium text-amber-800">
            BigQuery Data Maintenance
          </span>
          <div className="w-80 rounded border border-slate-300 px-3 py-2 text-sm text-slate-500">Search</div>
        </div>

        <div className="flex items-center gap-2">
          {["Map", "Bell", "Inbox", "Tools"].map((icon) => (
            <div
              key={icon}
              className="hidden rounded border border-host-border px-2 py-1 text-xs text-slate-600 sm:block"
              aria-label={icon}
            >
              {icon}
            </div>
          ))}
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-host-border bg-slate-100 text-xs font-semibold">
            LU
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-[270px_1fr]">
        <aside className="border-r border-host-border bg-white">
          <div className="border-b border-host-border px-4 py-4">
            <h2 className="text-[30px] font-light leading-none text-slate-700">Favorites</h2>
          </div>

          <div className="h-[calc(100vh-8.5rem)] overflow-y-auto px-4 py-3">
            {FAVORITES_SECTIONS.map((section) => (
              <section key={section.title} className="mb-6">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">{section.title}</h3>
                <ul className="space-y-2 text-sm">
                  {section.items.map((item) => (
                    <li key={item} className="cursor-default text-slate-500">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="border-t border-host-border bg-slate-50 px-4 py-3 text-xs text-slate-500">
            J.B. Hunt Corporation
          </div>
        </aside>

        <main className="p-5 lg:p-6">
          <section className="mb-3">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome Fist Name!</h2>
            <p className="text-sm text-slate-600">Here is how things are looking</p>
          </section>

          <section className="rounded-lg border border-host-border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-host-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold">LD</div>
                <h3 className="text-3xl font-semibold tracking-tight">Lucas Dorrough&apos;s Tasks</h3>
              </div>
              <div className="text-xs text-slate-400">Host controls</div>
            </div>

            <div className="grid grid-cols-[290px_1fr]">
              <aside className="border-r border-host-border bg-slate-50">
                <div className="border-b border-host-border px-4 py-3">
                  <h4 className="text-[28px] font-light leading-none">Task List</h4>
                </div>
                <div className="px-2 py-2">
                  <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold uppercase text-slate-500">
                    <span>Developers</span>
                    <span>{TASK_CATEGORIES.length}</span>
                  </div>
                  <ul className="space-y-1">
                    {TASK_CATEGORIES.map((category) => {
                      const selected = state.selectedCategory === category;
                      return (
                        <li key={category}>
                          <button
                            type="button"
                            onClick={() => handleCategoryClick(category)}
                            className={`flex w-full items-center justify-between border-l-4 px-3 py-2 text-left text-sm transition ${
                              selected
                                ? "border-host-accent bg-sky-50 font-semibold text-host-accent"
                                : "border-transparent text-slate-700 hover:bg-slate-100"
                            }`}
                            data-testid={`category-${category.replace(/\s+/g, "-").toLowerCase()}`}
                          >
                            <span>{category}</span>
                            <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">{TASK_COUNTS[category]}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </aside>

              <div className="h-[500px]">{renderTaskContent()}</div>
            </div>
          </section>

          <section className="mt-5 rounded-lg border border-host-border bg-white shadow-sm">
            <div className="border-b border-host-border px-5 py-3">
              <h3 className="text-3xl font-semibold tracking-tight">My Insights</h3>
            </div>
            <div className="px-5 py-4 text-sm text-slate-500">
              Host dashboard content placeholder to simulate additional chrome below the tasks panel.
            </div>
          </section>
        </main>
      </div>

      {state.detailItemId && (
        <div className="fixed inset-0 z-50 bg-black/65" data-testid="detail-overlay">
          <iframe
            title="Groundtruth Detail Iframe"
            src={detailIframeSrc}
            className="h-full w-full border-0"
            data-testid="groundtruth-detail-iframe"
          />
        </div>
      )}
    </div>
  );
}
