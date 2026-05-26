import { getProviders, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import styles from '../../styles/SignIn.module.css';

export default function SignIn({ providers }) {
  const router = useRouter();
  const { error } = router.query;

  const providerStyles = {
    google: { icon: <FaGoogle />, color: '#4285f4' },
    github: { icon: <FaGithub />, color: '#333' },
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome to Orbx AI</h1>
        <p className={styles.subtitle}>Sign in to access your FTC assistant</p>

        {error && (
          <div className={styles.error}>
            {error === 'OAuthSignin' && 'Error starting sign in. Try again.'}
            {error === 'OAuthCallback' && 'Error during sign in. Try again.'}
            {error === 'Default' && 'Something went wrong. Try again.'}
          </div>
        )}

        <div className={styles.providers}>
          {providers &&
            Object.values(providers).map((provider) => {
              const style = providerStyles[provider.id] || {};
              return (
                <button
                  key={provider.id}
                  className={styles.providerBtn}
                  style={{ backgroundColor: style.color || '#667eea' }}
                  onClick={() => signIn(provider.id, { callbackUrl: '/chat' })}
                >
                  <span className={styles.icon}>{style.icon}</span>
                  <span>Sign in with {provider.name}</span>
                </button>
              );
            })}
        </div>

        <div className={styles.info}>
          <p>No password needed - sign in with your existing account</p>
          <p className={styles.ftcNote}>Built for the FTC community</p>
        </div>

        <a href="/chat" className={styles.skipLink}>
          Continue without signing in
        </a>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const providers = await getProviders();
  return { props: { providers: providers ?? {} } };
}