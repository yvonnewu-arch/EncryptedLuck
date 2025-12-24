import { useMemo, useState } from 'react';
import { Contract, ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/StatusPanel.css';

type StatusPanelProps = {
  isConnected: boolean;
  address?: string;
  instance: any;
  signerPromise?: Promise<ethers.JsonRpcSigner>;
  ticketActive: boolean;
  ticketLoading: boolean;
  drawLoading: boolean;
  pointsLoading: boolean;
  ticketFirst?: string;
  ticketSecond?: string;
  drawFirst?: string;
  drawSecond?: string;
  pointsHandle?: string;
  isConfigured: boolean;
  onUpdated: () => Promise<void>;
};

const ZERO_HASH = ethers.ZeroHash;

export function StatusPanel({
  isConnected,
  address,
  instance,
  signerPromise,
  ticketActive,
  ticketLoading,
  drawLoading,
  pointsLoading,
  ticketFirst,
  ticketSecond,
  drawFirst,
  drawSecond,
  pointsHandle,
  isConfigured,
  onUpdated,
}: StatusPanelProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [clearPoints, setClearPoints] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const isReadyToDraw = useMemo(() => {
    return isConnected && ticketActive && !!signerPromise && isConfigured;
  }, [isConnected, ticketActive, signerPromise, isConfigured]);

  const formatHandle = (handle?: string) => {
    if (!handle) {
      return '—';
    }
    if (handle === ZERO_HASH) {
      return '0x0';
    }
    return `${handle.slice(0, 10)}…${handle.slice(-6)}`;
  };

  const drawNow = async () => {
    setStatusMessage('');
    setClearPoints(null);

    if (!isConnected || !address) {
      setStatusMessage('Connect your wallet to start the draw.');
      return;
    }

    if (!isConfigured) {
      setStatusMessage('Contract address is not configured.');
      return;
    }

    if (!ticketActive) {
      setStatusMessage('No active ticket. Buy a ticket first.');
      return;
    }

    try {
      setIsDrawing(true);
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not ready');
      }

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.draw();
      setStatusMessage('Drawing in progress...');
      await tx.wait();
      setStatusMessage('Draw complete. Points updated.');
      await onUpdated();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Draw failed.';
      setStatusMessage(message);
    } finally {
      setIsDrawing(false);
    }
  };

  const decryptPoints = async () => {
    setStatusMessage('');

    if (!instance || !address || !signerPromise || !pointsHandle) {
      setStatusMessage('Connect wallet and load points before decrypting.');
      return;
    }

    if (!isConfigured) {
      setStatusMessage('Contract address is not configured.');
      return;
    }

    if (pointsHandle === ZERO_HASH) {
      setClearPoints(0);
      return;
    }

    try {
      setIsDecrypting(true);
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Signer not ready');
      }

      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: pointsHandle,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CONTRACT_ADDRESS];
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const value = result[pointsHandle];
      setClearPoints(value === undefined ? 0 : Number(value));
      setStatusMessage('Points decrypted.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Decryption failed.';
      setStatusMessage(message);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <section className="panel status-panel">
      <div className="panel-header">
        <h3 className="panel-title">Draw and points</h3>
        <p className="panel-subtitle">Encrypted results until you decrypt</p>
      </div>

      <div className="status-grid">
        <div className="status-block">
          <span className="status-label">Ticket status</span>
          <span className={`status-pill ${ticketActive ? 'active' : 'inactive'}`}>
            {ticketLoading ? 'Loading...' : ticketActive ? 'Active' : 'None'}
          </span>
        </div>
        <div className="status-block">
          <span className="status-label">Connected</span>
          <span className="status-pill neutral">
            {isConnected && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected'}
          </span>
        </div>
      </div>

      <div className="handle-list">
        <div className="handle-row">
          <span className="handle-label">Ticket handles</span>
          <span className="handle-value" title={ticketFirst || ''}>
            {ticketLoading ? 'Loading...' : `${formatHandle(ticketFirst)} / ${formatHandle(ticketSecond)}`}
          </span>
        </div>
        <div className="handle-row">
          <span className="handle-label">Last draw</span>
          <span className="handle-value" title={drawFirst || ''}>
            {drawLoading ? 'Loading...' : `${formatHandle(drawFirst)} / ${formatHandle(drawSecond)}`}
          </span>
        </div>
        <div className="handle-row">
          <span className="handle-label">Encrypted points</span>
          <span className="handle-value" title={pointsHandle || ''}>
            {pointsLoading ? 'Loading...' : formatHandle(pointsHandle)}
          </span>
        </div>
      </div>

      <div className="ticket-actions">
        <button type="button" className="primary-button" onClick={drawNow} disabled={!isReadyToDraw || isDrawing}>
          {isDrawing ? 'Drawing...' : 'Start draw'}
        </button>
        <button
          type="button"
          className="ghost-button"
          onClick={decryptPoints}
          disabled={!isConnected || !pointsHandle || !instance || isDecrypting || !isConfigured}
        >
          {isDecrypting ? 'Decrypting...' : 'Decrypt points'}
        </button>
      </div>

      {clearPoints !== null && (
        <div className="points-result">
          <span className="points-label">Clear points</span>
          <span className="points-value">{clearPoints}</span>
        </div>
      )}

      {statusMessage && <p className="status-message">{statusMessage}</p>}
      {!isConfigured && (
        <div className="panel-hint">
          Update the contract address to enable draws and decryption.
        </div>
      )}
    </section>
  );
}
