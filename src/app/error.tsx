"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="loading-screen">
      <h1>Let’s try that again.</h1>
      <p>
        The workspace hit an unexpected error. Your saved data stays in this
        browser.
      </p>
      <button className="button primary" onClick={reset}>
        Reload workspace
      </button>
    </div>
  );
}
