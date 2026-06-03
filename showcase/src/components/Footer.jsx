export default function Footer({ onDemo }) {
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <div className="footer-cta">
          <strong className="display">Ready to test it on your own repo?</strong>
          <button className="btn btn-primary" onClick={onDemo} type="button">
            Try the skill
          </button>
        </div>
        <div className="footer-meta">
          <span>re-forge hackathon showcase</span>
          <a href="https://github.com/Akasxh/claude-forge" target="_blank" rel="noreferrer">
            github.com/Akasxh/claude-forge
          </a>
        </div>
      </div>
    </footer>
  );
}
