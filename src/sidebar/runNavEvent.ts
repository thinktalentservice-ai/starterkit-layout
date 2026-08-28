/**
 * Runs a nav row's `event`. THE ONLY PLACE IN THIS PACKAGE THAT TURNS A STRING
 * INTO CODE — one module, one call to `new Function`, so `grep -rn "new Function"
 * src` returns exactly one line and swapping this for a resolver later is a
 * change to one file.
 *
 * The event string is a FUNCTION BODY compiled in global scope and called with
 * no arguments, which is what the model it ports allows for: the value is a
 * varchar an administrator types into an admin screen, so it can only ever reach
 * globals. `FreshworksWidget('open')` works because the widget puts itself on
 * `window`; nothing here can see React state, props, or this package's
 * internals, and no amount of wishing changes that.
 *
 * The string is executed verbatim and nothing is ever interpolated into it, so
 * the trust boundary is the navigation table itself: whoever can write a row can
 * run script in the page. That is the same boundary the source had, and it is
 * why this must never be fed anything an end user can set.
 *
 * Cost, stated once: the host's CSP needs `script-src 'unsafe-eval'`. Without it
 * the constructor throws EvalError, which is caught below, so a locked-down CSP
 * degrades to "the row does nothing and says so in the console" rather than to a
 * blank page.
 *
 * SSR-safe by construction rather than by a guard: this is called from an
 * onClick handler and from nowhere else, so it cannot run during render, and
 * nothing here touches `window` or `document` at module scope. There is
 * deliberately no `typeof window` check — one would imply this is reachable on
 * the server and invite someone to call it from a component body.
 *
 * No "use client" directive, matching constants.ts: no hooks, no JSX, no browser
 * API at module scope. tsup's banner attaches the directive to the chunk.
 */
export function runNavEvent(event: string | undefined, label?: string): void {
  /* An empty event does NOT reach the compiler. `new Function("")` is a valid
     no-op, so this is not about correctness — it is about not asking a CSP for
     an eval that was never going to do anything, and not paying an EvalError on
     every click of a row whose event column is still null. */
  if (!event || event.trim() === "") return;

  try {
    /* Compiled per click, not cached. A cached function would outlive the item
       that produced it and keep whatever the string closed over alive with it,
       to save a compile that happens at most once per user gesture. */
    new Function(event)();
  } catch (error) {
    /* console.error, not a throw: this string comes from a database row an admin
       edited, and one bad row must not take the sidebar — or the page — down.
       The label is in the message because "SyntaxError: Unexpected token" with
       no row name is unactionable when forty rows are on screen, and the source
       is in it because the next question is always "what did it try to run". */
    console.error(
      `[starterkit-layout] nav event failed${label ? ` on "${label}"` : ""}: ${event}`,
      error,
    );
  }
}
