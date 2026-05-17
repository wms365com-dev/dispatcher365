import Link from "next/link";

import { PRODUCT_NAME } from "@/lib/branding";
import { signInAction } from "@/lib/server/auth-actions";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  signUpAction
} from "@/lib/server/account-actions";
import {
  demoCredentials,
  demoSeedingEnabled
} from "@/lib/server/demo-seed";

interface PublicSignInPanelProps {
  errorMessage?: string;
  resetComplete?: boolean;
}

export function PublicSignInPanel({
  errorMessage,
  resetComplete
}: PublicSignInPanelProps) {
  return (
    <div className="legacy-auth">
      <h1>{PRODUCT_NAME.toUpperCase()}</h1>

      {errorMessage ? (
        <p className="legacy-auth__message legacy-auth__message--error">{errorMessage}</p>
      ) : null}
      {resetComplete ? (
        <p className="legacy-auth__message legacy-auth__message--success">
          Password updated. Sign in with your new password.
        </p>
      ) : null}

      <form action={signInAction} className="legacy-auth__form">
        <div className="legacy-auth__field-row">
          <label className="legacy-auth__field">
            <span>Email</span>
            <input
              defaultValue={
                demoSeedingEnabled && process.env.NODE_ENV !== "production"
                  ? demoCredentials.email
                  : ""
              }
              name="email"
              type="email"
              required
            />
          </label>
          <label className="legacy-auth__field">
            <span>Password</span>
            <input
              defaultValue={
                demoSeedingEnabled && process.env.NODE_ENV !== "production"
                  ? demoCredentials.password
                  : ""
              }
              name="password"
              type="password"
              required
            />
          </label>
        </div>

        <div className="legacy-auth__action-row">
          <label className="legacy-auth__remember">
            <span>Remember Me</span>
            <input name="remember" type="checkbox" />
          </label>

          <div className="legacy-auth__sign-in-actions">
            <Link href="/forgot-password">Forgot Password?</Link>
            <button className="legacy-auth__submit" type="submit">
              Sign In
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

interface PublicForgotPanelProps {
  sent?: boolean;
}

export function PublicForgotPanel({ sent }: PublicForgotPanelProps) {
  return (
    <div className="legacy-auth legacy-auth--forgot">
      <h1>{PRODUCT_NAME.toUpperCase()}</h1>
      <h2>Forgot Password ?</h2>
      <p className="legacy-auth__tagline legacy-auth__tagline--compact">
        Enter your e-mail address below to reset your password.
      </p>

      {sent ? (
        <p className="legacy-auth__message legacy-auth__message--success">
          If that email exists, a reset link is on the way.
        </p>
      ) : null}

      <form action={requestPasswordResetAction} className="legacy-auth__forgot-form">
        <label className="legacy-auth__field legacy-auth__field--single legacy-auth__field--placeholder-only">
          <span>Email</span>
          <input name="email" type="email" placeholder="Email" required />
        </label>

        <div className="legacy-auth__forgot-actions">
          <Link className="legacy-auth__back" href="/sign-in">
            Back
          </Link>
          <button className="legacy-auth__submit" type="submit">
            SUBMIT
          </button>
        </div>
      </form>
    </div>
  );
}

interface PublicResetPanelProps {
  token: string;
  errorMessage?: string;
}

export function PublicResetPanel({
  token,
  errorMessage
}: PublicResetPanelProps) {
  return (
    <div className="legacy-auth legacy-auth--forgot">
      <h1>{PRODUCT_NAME.toUpperCase()}</h1>
      <h2>Reset Password</h2>
      <p className="legacy-auth__tagline legacy-auth__tagline--compact">
        Reset links are one-time use and expire after one hour.
      </p>

      {errorMessage ? (
        <p className="legacy-auth__message legacy-auth__message--error">{errorMessage}</p>
      ) : null}

      <form action={resetPasswordAction} className="legacy-auth__forgot-form">
        <input name="token" type="hidden" value={token} />
        <label className="legacy-auth__field legacy-auth__field--single legacy-auth__field--placeholder-only">
          <span>New Password</span>
          <input
            name="password"
            type="password"
            placeholder="New Password"
            minLength={8}
            required
          />
        </label>
        <label className="legacy-auth__field legacy-auth__field--single legacy-auth__field--placeholder-only">
          <span>Confirm Password</span>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            minLength={8}
            required
          />
        </label>

        <div className="legacy-auth__forgot-actions">
          <Link className="legacy-auth__back" href="/forgot-password">
            Need a new link?
          </Link>
          <button className="legacy-auth__submit" type="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

interface PublicSignUpModalProps {
  errorMessage?: string;
}

export function PublicSignUpModal({ errorMessage }: PublicSignUpModalProps) {
  return (
    <section className="legacy-modal">
      <header className="legacy-modal__header">
        <h2>Register</h2>
        <h3>Your Company Information</h3>
        <Link aria-label="Close registration" className="legacy-modal__close" href="/sign-in">
          ×
        </Link>
      </header>

      {errorMessage ? (
        <p className="legacy-auth__message legacy-auth__message--error legacy-modal__message">
          {errorMessage}
        </p>
      ) : null}

      <form action={signUpAction} className="legacy-modal__form" id="legacy-sign-up-form">
        <div className="legacy-modal__column legacy-modal__column--account">
          <div className="legacy-modal__avatar">
            <div className="legacy-modal__avatar-box" />
            <button className="legacy-modal__avatar-button" type="button">
              Select image
            </button>
            <div className="legacy-modal__avatar-note">
              <p>
                <strong>NOTE!</strong> Image preview is optional here. The important part is
                keeping your company, billing, and warehouse details lined up with how your
                team already ships today so the move into {PRODUCT_NAME} feels familiar from day one.
              </p>
            </div>
          </div>

          <label className="legacy-modal__field">
            <span>Name</span>
            <input name="fullName" placeholder="Name" required />
          </label>
          <label className="legacy-modal__field">
            <span>Email</span>
            <input name="email" type="email" placeholder="Email" required />
          </label>
          <label className="legacy-modal__field">
            <span>Password</span>
            <input name="password" type="password" placeholder="Password" minLength={8} required />
          </label>
          <label className="legacy-modal__field">
            <span>Confirm Password</span>
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              minLength={8}
              required
            />
          </label>
        </div>

        <div className="legacy-modal__column">
          <label className="legacy-modal__field">
            <span>Address</span>
            <input name="companyAddress1" placeholder="Address" />
          </label>
          <label className="legacy-modal__field">
            <span>City</span>
            <input name="companyCity" placeholder="City" />
          </label>
          <label className="legacy-modal__field">
            <span>Country</span>
            <select name="companyCountry" defaultValue="">
              <option value="">Please choose</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </label>
          <label className="legacy-modal__field">
            <span>Zipcode</span>
            <input name="companyPostalCode" placeholder="Zipcode" />
          </label>
          <label className="legacy-modal__field">
            <span>Phone number</span>
            <input name="phone" placeholder="Phone number" />
          </label>
          <label className="legacy-modal__field">
            <span>Fax</span>
            <input name="companyFax" placeholder="Fax number" />
          </label>
        </div>

        <div className="legacy-modal__column">
          <label className="legacy-modal__field">
            <span>Name</span>
            <input name="companyName" placeholder="Name" required />
          </label>
          <label className="legacy-modal__field">
            <span>Email</span>
            <input name="billingEmail" type="email" placeholder="Email" />
          </label>
          <label className="legacy-modal__field">
            <span>Address</span>
            <input name="billingAddress1" placeholder="Address" />
          </label>
          <label className="legacy-modal__field">
            <span>City</span>
            <input name="billingCity" placeholder="City" />
          </label>
          <label className="legacy-modal__field">
            <span>Country</span>
            <select name="billingCountry" defaultValue="">
              <option value="">Please choose</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </label>
          <label className="legacy-modal__field">
            <span>Zipcode</span>
            <input name="billingPostalCode" placeholder="Zipcode" />
          </label>
        </div>

        <div className="legacy-modal__column">
          <label className="legacy-modal__field">
            <span>Warehouse Address</span>
            <input name="warehouseAddress1" placeholder="Warehouse Address" />
          </label>
          <label className="legacy-modal__field">
            <span>Warehouse City</span>
            <input name="warehouseCity" placeholder="Warehouse City" />
          </label>
          <label className="legacy-modal__field">
            <span>Warehouse Country</span>
            <select name="warehouseCountry" defaultValue="">
              <option value="">Please choose</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </label>
          <label className="legacy-modal__field">
            <span>Warehouse Zipcode</span>
            <input name="warehousePostalCode" placeholder="Warehouse Zipcode" />
          </label>
          <label className="legacy-modal__field">
            <span>Phone number</span>
            <input name="warehousePhone" placeholder="Phone number" />
          </label>
          <label className="legacy-modal__field">
            <span>Fax</span>
            <input name="warehouseFax" placeholder="Fax number" />
          </label>
          <label className="legacy-modal__field">
            <span>Website</span>
            <input name="website" placeholder="Website" />
          </label>
        </div>
      </form>

      <footer className="legacy-modal__footer">
        <div className="legacy-modal__cta">
          <button className="legacy-auth__submit legacy-auth__submit--wide" type="submit" form="legacy-sign-up-form">
            Submit Form
          </button>
          <button className="legacy-modal__reset" type="reset" form="legacy-sign-up-form">
            Reset
          </button>
        </div>
        <Link className="legacy-auth__back legacy-modal__close-button" href="/sign-in">
          Close
        </Link>
      </footer>
    </section>
  );
}
