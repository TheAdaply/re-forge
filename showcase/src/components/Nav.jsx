export default function Nav({ onDemo }) {
  return (
    <header className="site-nav">
      <div className="wrap nav-inner">
        <a href="#top" className="brand" aria-label="re-forge home">
          <img className="brand-logo" src="/logo.jpeg" alt="re-forge logo" width="32" height="32" />
          <span className="brand-name">re-forge</span>
          <span className="mono brand-sub">agent ops</span>
        </a>
        <nav className="mono nav-links" aria-label="Primary navigation">
          <a href="#top">Live demo</a>
          <a href="#commands">Commands</a>
        </nav>
        <button className="btn btn-primary nav-cta" onClick={onDemo} type="button">
          Try the skill
        </button>
      </div>
    </header>
  );
}
