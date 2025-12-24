import { useMemo, useState } from 'react';
import { Contract, ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/TicketPanel.css';

type TicketPanelProps = {
  isConnected: boolean;
  address?: string;
  instance: any;
  signerPromise?: Promise<ethers.JsonRpcSigner>;
  ticketActive: boolean;
  ticketPrice: bigint;
  ticketPriceLabel: string;
  zamaLoading: boolean;
  zamaError: string | null;
  isConfigured: boolean;
  onPurchased: () => Promise<void>;
};

const BALLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function TicketPanel({
  isConnected,
  address,
  instance,
  signerPromise,
  ticketActive,
  ticketPrice,
  ticketPriceLabel,
  zamaLoading,
  zamaError,
  isConfigured,
  onPurchased,
}: TicketPanelProps) {
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const [secondPick, setSecondPick] = useState<number | null>(null);
  const [isBuying, setIsBuying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [txHash, setTxHash] = useState('');

  const isReady = useMemo(() => {
    return (
      !!firstPick &&
      !!secondPick &&
      isConnected &&
      !!address &&
      !!instance &&
      !!signerPromise &&
      !ticketActive &&
      isConfigured
    );
  }, [firstPick, secondPick, isConnected, address, instance, signerPromise, ticketActive, isConfigured]);

  const randomize = () => {
    const shuffled = [...BALLS].sort(() => 0.5 - Math.random());
    setFirstPick(shuffled[0]);
    setSecondPick(shuffled[1]);
  };

  const buyTicket = async () => {
    setStatusMessage('');
    setTxHash('');

    if (!isConnected || !address) {
      setStatusMessage('Connect your wallet to buy a ticket.');
      return;
    }

    if (!isConfigured) {
      setStatusMessage('Contract address is not configured.');
      return;
    }

    if (!instance || zamaLoading) {
      setStatusMessage('Encryption service is still loading.');
      return;
    }

    if (zamaError) {
      setStatusMessage(zamaError);
      return;
    }

    if (!firstPick || !secondPick) {
      setStatusMessage('Pick both numbers before buying.');
      return;
    }

    if (ticketActive) {
      setStatusMessage('You already have an active ticket. Draw before buying another.');
      return;
    }

    try {
      setIsBuying(true);
      setStatusMessage('Encrypting your picks...');

      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add8(firstPick);
      input.add8(secondPick);
      const encrypted = await input.encrypt();

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not ready');
      }

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const value = ticketPrice > 0n ? ticketPrice : ethers.parseEther('0.001');

      setStatusMessage('Waiting for wallet confirmation...');
      const tx = await contract.buyTicket(encrypted.handles[0], encrypted.handles[1], encrypted.inputProof, {
        value,
      });

      setTxHash(tx.hash);
      setStatusMessage('Transaction submitted. Waiting for confirmation...');
      await tx.wait();

      setStatusMessage('Ticket confirmed. Ready to draw!');
      await onPurchased();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to buy ticket.';
      setStatusMessage(message);
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <section className="panel ticket-panel">
      <div className="panel-header">
        <h3 className="panel-title">Buy a ticket</h3>
        <p className="panel-subtitle">Encrypted picks · {ticketPriceLabel} ETH</p>
      </div>

      <div className="pick-section">
        <div className="pick-group">
          <span className="pick-label">Ball one</span>
          <div className="ball-grid">
            {BALLS.map((value) => (
              <button
                key={`first-${value}`}
                type="button"
                className={`ball-button ${firstPick === value ? 'selected' : ''}`}
                onClick={() => setFirstPick(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="pick-group">
          <span className="pick-label">Ball two</span>
          <div className="ball-grid">
            {BALLS.map((value) => (
              <button
                key={`second-${value}`}
                type="button"
                className={`ball-button ${secondPick === value ? 'selected' : ''}`}
                onClick={() => setSecondPick(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ticket-actions">
        <button type="button" className="ghost-button" onClick={randomize} disabled={ticketActive}>
          Lucky dip
        </button>
        <button type="button" className="primary-button" onClick={buyTicket} disabled={!isReady || isBuying}>
          {isBuying ? 'Processing...' : ticketActive ? 'Ticket active' : 'Buy encrypted ticket'}
        </button>
      </div>

      {statusMessage && <p className="status-message">{statusMessage}</p>}
      {txHash && (
        <p className="status-hash">
          Tx: <span>{txHash.slice(0, 12)}…{txHash.slice(-6)}</span>
        </p>
      )}

      {!isConnected && (
        <div className="panel-hint">
          Connect your wallet to encrypt picks and purchase a ticket.
        </div>
      )}
      {!isConfigured && (
        <div className="panel-hint">
          Update the contract address to enable ticket purchases.
        </div>
      )}
    </section>
  );
}
