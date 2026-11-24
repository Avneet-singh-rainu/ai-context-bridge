import { Lock } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useBrowser } from './BrowserProvider';

/** Draws in the page box while main hides the native view for the active credential request. */
export function BrowserLoginPrompt() {
  const { loginRequest, submitLogin } = useBrowser();
  const userRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const requestId = loginRequest?.requestId;
  useEffect(() => {
    setUsername('');
    setPassword('');
    if (!requestId) return;
    const frame = requestAnimationFrame(() => userRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [requestId]);

  if (!loginRequest) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitLogin({
      requestId: loginRequest.requestId,
      accept: true,
      username,
      password,
    });
  };

  return (
    <div className="login-shade">
      <form
        className="login-card"
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        onSubmit={submit}
      >
        <span className="login-mark" aria-hidden="true">
          <Lock size={18} strokeWidth={1.9} />
        </span>
        <h2>Sign in required</h2>
        <p>
          {loginRequest.isProxy ? 'The proxy asks' : loginRequest.host} for a username and password
          before this page can continue.
        </p>
        {loginRequest.realm && <p className="login-realm">Realm: {loginRequest.realm}</p>}
        <label>
          Username
          <input
            ref={userRef}
            autoComplete="username"
            maxLength={512}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            maxLength={512}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div className="login-actions">
          <button
            type="button"
            className="btn"
            onClick={() => submitLogin({ requestId: loginRequest.requestId, accept: false })}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={username.trim() === ''}>
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
}
