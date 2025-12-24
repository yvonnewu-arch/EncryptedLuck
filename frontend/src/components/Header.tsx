import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="site-header">
      <div className="header-shell">
        <div className="header-copy">
          <span className="header-eyebrow">EncryptedLuck</span>
          <h1 className="header-title">Encrypted Luck</h1>
          <p className="header-subtitle">A privacy-first, two-ball lottery on Sepolia.</p>
        </div>
        <div className="header-actions">
          <ConnectButton showBalance={false} />
        </div>
      </div>
    </header>
  );
}
