import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle, Orbit, Sparkles } from 'lucide-react';
import { api } from './api';
import { Field, Logo } from './ui';

export default function Auth({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [register, setRegister] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    try {
      if (register) {
        await api('/api/auth/register', {
          method: 'POST',
          body: {
            name: form.get('name'),
            email,
            password,
            spaceName: form.get('spaceName'),
          },
        });
      }
      await api('/api/auth/login', {
        method: 'POST',
        body: new URLSearchParams({ email, password }),
      });
      await onSuccess();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Logo />
        <div className="auth-story-copy">
          <span className="auth-kicker">
            <span className="live-dot" /> VOTRE NOUVEL ESPACE DE TRAVAIL
          </span>
          <h1>
            Un peu d’ordre.
            <br />
            Beaucoup
            <br />
            <em>d’élan.</em>
          </h1>
          <p>
            Des projets qui avancent, des relations qui comptent, et une IA pour voir plus loin.
          </p>
          <div className="auth-benefits">
            <span>
              <Check size={17} /> Tous vos projets, un seul endroit
            </span>
            <span>
              <Check size={17} /> Vos données, dans le bon espace
            </span>
            <span>
              <Sparkles size={17} /> Une IA qui prépare, vous qui décidez
            </span>
          </div>
        </div>
        <div className="auth-orbits" aria-hidden="true">
          <Orbit size={290} strokeWidth={0.45} />
        </div>
        <footer>Moins de dispersion. Plus de possibilités.</footer>
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow">FAITES DE LA PLACE À VOS IDÉES</span>
          <h2>{register ? 'Votre prochaine étape commence ici.' : 'Heureux de vous retrouver.'}</h2>
          <p>
            {register
              ? 'Créez votre compte et votre premier espace.'
              : 'Connectez-vous pour reprendre là où vous en étiez.'}
          </p>
          <div className="auth-tabs">
            <button
              className={!register ? 'active' : ''}
              onClick={() => {
                setRegister(false);
                setError('');
              }}
              disabled={pending}
            >
              Connexion
            </button>
            <button
              className={register ? 'active' : ''}
              onClick={() => {
                setRegister(true);
                setError('');
              }}
              disabled={pending}
            >
              Créer un compte
            </button>
          </div>
          <form onSubmit={submit}>
            {register && (
              <Field label="Votre nom">
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Prénom et nom"
                  maxLength={100}
                  required
                />
              </Field>
            )}
            <Field label="Adresse e-mail">
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vous@entreprise.fr"
                maxLength={254}
                required
              />
            </Field>
            <Field
              label="Mot de passe"
              hint={register ? 'Entre 12 et 72 caractères (72 octets maximum).' : undefined}
            >
              <div className="password-field">
                <input
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder={register ? 'Créez un mot de passe' : 'Votre mot de passe'}
                  minLength={register ? 12 : undefined}
                  maxLength={72}
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setVisible(!visible)}
                  aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {register && (
              <Field label="Nom de votre espace">
                <input name="spaceName" placeholder="Mon entreprise" maxLength={100} required />
              </Field>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary auth-submit" disabled={pending}>
              {pending ? (
                <LoaderCircle size={18} className="spin" />
              ) : (
                <>
                  {register ? 'Créer mon espace' : 'Se connecter'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="auth-footnote">
            Un espace personnel pour transformer vos objectifs en prochaines actions.
          </p>
        </div>
      </main>
    </div>
  );
}
