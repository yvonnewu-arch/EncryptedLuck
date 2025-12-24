import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { TicketPanel } from './TicketPanel';
import { StatusPanel } from './StatusPanel';
import '../styles/EncryptedLuckApp.css';

// const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function EncryptedLuckApp() {
  const { address, isConnected } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const isConfigured = true;

  const { data: ticketData, refetch: refetchTicket, isFetching: ticketLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getTicket',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConfigured,
    },
  });

  const { data: drawData, refetch: refetchDraw, isFetching: drawLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getLastDraw',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConfigured,
    },
  });

  const { data: pointsData, refetch: refetchPoints, isFetching: pointsLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPoints',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConfigured,
    },
  });

  const { data: priceData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getTicketPrice',
    query: {
      enabled: isConfigured,
    },
  });

  const ticketActive = ticketData ? ticketData[2] : false;
  const ticketPrice = typeof priceData === 'bigint' ? priceData : 0n;
  const ticketPriceLabel = ticketPrice ? formatEther(ticketPrice) : '0.001';

  const ticketFirst = ticketData ? (ticketData[0] as string) : undefined;
  const ticketSecond = ticketData ? (ticketData[1] as string) : undefined;
  const drawFirst = drawData ? (drawData[0] as string) : undefined;
  const drawSecond = drawData ? (drawData[1] as string) : undefined;
  const pointsHandle = pointsData ? (pointsData as string) : undefined;

  const refreshAll = async () => {
    await Promise.all([refetchTicket(), refetchDraw(), refetchPoints()]);
  };

  return (
    <div className="luck-app">
      <section className="hero">
        <span className="hero-badge">Sepolia · FHE Lottery</span>
        <h2 className="hero-title">Two encrypted balls. One bold draw.</h2>
        <p className="hero-copy">
          Choose two numbers from 1 to 9, pay {ticketPriceLabel} ETH, and let the encrypted draw decide your fate.
          Points stay sealed until you decrypt them yourself.
        </p>
        <div className="hero-meta">
          <div className="meta-card">
            <span className="meta-label">Ticket price</span>
            <span className="meta-value">{ticketPriceLabel} ETH</span>
          </div>
          <div className="meta-card">
            <span className="meta-label">Rewards</span>
            <span className="meta-value">1 match = 1 point · 2 matches = 10 points</span>
          </div>
        </div>
      </section>

      <div className="panel-grid">
        <TicketPanel
          isConnected={isConnected}
          address={address}
          instance={instance}
          signerPromise={signerPromise}
          ticketActive={ticketActive}
          ticketPrice={ticketPrice}
          ticketPriceLabel={ticketPriceLabel}
          zamaLoading={zamaLoading}
          zamaError={zamaError}
          isConfigured={isConfigured}
          onPurchased={refreshAll}
        />

        <StatusPanel
          isConnected={isConnected}
          address={address}
          instance={instance}
          signerPromise={signerPromise}
          ticketActive={ticketActive}
          ticketLoading={ticketLoading}
          drawLoading={drawLoading}
          pointsLoading={pointsLoading}
          ticketFirst={ticketFirst}
          ticketSecond={ticketSecond}
          drawFirst={drawFirst}
          drawSecond={drawSecond}
          pointsHandle={pointsHandle}
          isConfigured={isConfigured}
          onUpdated={refreshAll}
        />
      </div>
    </div>
  );
}
