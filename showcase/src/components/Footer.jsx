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
          <span>re-forge — multi-agent operating procedure for coding agents</span>
          <a href="https://github.com/Akasxh/re-forge" target="_blank" rel="noreferrer">
            github.com/Akasxh/re-forge
          </a>
        </div>
      </div>
    </footer>
  );
}
