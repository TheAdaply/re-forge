export default function Nav({ onDemo }) {
  return (
    <header className="site-nav">
      <div className="wrap nav-inner">
        <a href="#top" className="brand" aria-label="re-forge home">
          <span className="brand-dot" />
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
