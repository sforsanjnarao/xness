import { JSX } from "react";

export default function NotFound():JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Oops! Page not found
        </p>
        <a href="/trade" className="text-primary underline">
          Return to Home
        </a>
      </div>
    </div>
  );
}
