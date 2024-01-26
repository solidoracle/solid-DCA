'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/Base/Alert';
import { CircularLoader } from '@/components/Base/CircularLoader';
import { Deposit } from '@/components/Deposit';
import { Withdraw } from '@/components/Withdraw';
import { useGetDataPoolsQuery } from '@/queries/useGetDataPoolsQuery';

type TabType = 'deposit' | 'withdraw';
// TODO: Are we getting right pool data?
// TODO: Create SVGs in code so we don't have to use material UI SX and can use color variables for fill

export default function Home() {
  const { data: poolData, isLoading, isError } = useGetDataPoolsQuery();
  const [value, setValue] = useState<TabType>('deposit');
  const hasError = isError || !poolData?.[0]?.apy;

  const handleChange = (tabType: TabType) => {
    setValue(tabType);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <CircularLoader size="large" color="contrast" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[100%] min-h-[100vh] max-w-[1200px] flex-col p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-2xl font-bold text-text-contrast">🐮SOLID-DCA🐮</p>
        </div>
        <ConnectButton />
      </header>
      <main className="grow pt-10 md:pt-28">
        {hasError ? (
          <div className="align-center my-10 flex justify-center">
            <Alert
              variant="error"
              title="Unable to connect to Cowswap"
              description="We cannot retrieve the current APY. Please try again later."
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-fit rounded-xl bg-background-neutral p-8 sm:w-[480px]">
              <div className="mb-8 grid grid-cols-2 text-center">
                <div className={` font-semibold ${value === 'deposit' ? 'tab-active' : 'tab-inactive'}`}>
                  <button onClick={() => handleChange('deposit')} className="px-4 py-2">
                    SWAP
                  </button>
                </div>
              </div>
              {value === 'deposit' ? <Deposit apy={16} /> : <Withdraw />}
            </div>
          </div>
        )}
      </main>
      <footer className="flex justify-center text-xs text-text-contrast">
        <div>
          An experiment by{' '}
          <Link href="https://twitter.com/solidoracle" target="_blank" className="text-text-contrast underline">
            solidoracle
          </Link>
        </div>
      </footer>
    </div>
  );
}
