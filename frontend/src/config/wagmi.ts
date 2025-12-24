import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { createConfig, createStorage, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';

const { connectors } = getDefaultWallets({
  appName: 'Encrypted Luck',
  projectId: 'e0f6c6d4e4c9433d9e9181743d1a9c0a'
});

const memoryStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => undefined,
  removeItem: (_key: string) => undefined,
};

export const config = createConfig({
  chains: [sepolia],
  connectors,
  transports: {
    [sepolia.id]: http(),
  },
  ssr: false,
  storage: createStorage({ storage: memoryStorage }),
});
