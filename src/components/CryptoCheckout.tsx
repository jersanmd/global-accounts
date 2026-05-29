import { useState } from "react";
const ICO_CDN = "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color";
import { supabase } from "@/lib/supabase";
import { Copy, Check, Loader2, AlertTriangle, Search, X, ArrowLeft } from "lucide-react";
import { PLATFORM_USDC_ADDRESS, PLATFORM_BSC_ADDRESS, PLATFORM_TRON_ADDRESS, PLATFORM_KLAYTN_ADDRESS, PLATFORM_SOL_ADDRESS, PLATFORM_ICP_ADDRESS } from "@/lib/constants";

interface NetworkOption { network: string; address: string; fee: string; }
interface CoinOption { symbol: string; name: string; networks: NetworkOption[]; }
type Any = any;

const COIN_COLORS: Record<string, string> = {
  USDC: "bg-blue-500", USDT: "bg-emerald-500", DAI: "bg-amber-400", FDUSD: "bg-emerald-600", TUSD: "bg-teal-500",
  BTC: "bg-orange-500", ETH: "bg-indigo-500", BNB: "bg-yellow-500", SOL: "bg-purple-500",
  XRP: "bg-sky-500", ADA: "bg-blue-600", AVAX: "bg-red-500", DOT: "bg-pink-500", MATIC: "bg-purple-600",
  ATOM: "bg-rose-500", NEAR: "bg-gray-800", ALGO: "bg-gray-700", XLM: "bg-gray-600", FIL: "bg-cyan-600",
  TRX: "bg-red-600", APT: "bg-gray-500", SUI: "bg-blue-400", SEI: "bg-red-700", TIA: "bg-purple-700",
  ARB: "bg-blue-500", OP: "bg-red-500", UNI: "bg-pink-400", AAVE: "bg-purple-400", MKR: "bg-teal-700",
  LINK: "bg-blue-400", GRT: "bg-purple-500", FET: "bg-indigo-400", SAND: "bg-cyan-400", MANA: "bg-pink-400",
  AXS: "bg-blue-500", GALA: "bg-red-500", IMX: "bg-sky-500", DOGE: "bg-amber-400", SHIB: "bg-orange-400",
  PEPE: "bg-green-500", BONK: "bg-orange-500", LTC: "bg-gray-400", BCH: "bg-green-500",
  KAIA: "bg-gray-900", KLAY: "bg-red-500", POL: "bg-purple-600", STRK: "bg-violet-500",
  HBAR: "bg-emerald-700", INJ: "bg-cyan-700", TAO: "bg-gray-900", ETC: "bg-green-600", FLOW: "bg-emerald-500", EGLD: "bg-purple-600",
  APE: "bg-amber-500", JUP: "bg-emerald-500", JTO: "bg-green-400", PYTH: "bg-purple-500",
  CAKE: "bg-pink-500", ONDO: "bg-indigo-600", ZRO: "bg-gray-300", MNT: "bg-cyan-500", BLAST: "bg-yellow-400", MODE: "bg-lime-500",
  SCROLL: "bg-amber-300", ZKJ: "bg-teal-500", CELO: "bg-emerald-400", AXL: "bg-gray-500", WORM: "bg-indigo-500", ALT: "bg-rose-400", ENA: "bg-teal-400", ETHFI: "bg-blue-500",
  REZ: "bg-purple-400", OMNI: "bg-violet-500", SNX: "bg-cyan-500", SUSHI: "bg-pink-500", YFI: "bg-blue-700",
  BAL: "bg-gray-600", CVX: "bg-gray-700", FXS: "bg-emerald-600", GMX: "bg-blue-500", DYDX: "bg-indigo-600",
  JOE: "bg-red-400", STG: "bg-purple-400", RDNT: "bg-yellow-500", MAGIC: "bg-blue-300",
  TURBO: "bg-orange-500", MEW: "bg-amber-500", POPCAT: "bg-pink-400", NEIRO: "bg-orange-500",
  MOG: "bg-red-400", BRETT: "bg-blue-500", GOAT: "bg-gray-600", PENGU: "bg-sky-400",
  PIXEL: "bg-purple-500", MAVIA: "bg-red-500", XAI: "bg-orange-500", ACE: "bg-teal-500", PORTAL: "bg-indigo-500",
  AEVO: "bg-blue-400", VANRY: "bg-cyan-500", HIGH: "bg-red-500", BAKE: "bg-orange-400",
  MEME: "bg-yellow-500", PEOPLE: "bg-red-500", RACA: "bg-green-500",
  WIF: "bg-yellow-600", "1INCH": "bg-red-500", ZEC: "bg-yellow-600", DASH: "bg-blue-600",
};

function CoinIcon({ symbol }: { symbol: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    const c = COIN_COLORS[symbol] || "bg-gray-400";
    return <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${c} text-[10px] font-bold text-white`}>{symbol.slice(0, 1)}</span>;
  }
  return <img src={`${ICO_CDN}/${symbol.toLowerCase()}.svg`} alt={symbol} className="h-6 w-6 shrink-0" onError={() => setErr(true)} />;
}

const ETH = { network: "Ethereum (ERC-20)", address: PLATFORM_USDC_ADDRESS, fee: "~$0.50-$3" };
const BSC = { network: "BSC (BEP-20)", address: PLATFORM_BSC_ADDRESS, fee: "<$0.01" };
const TRON = { network: "Tron (TRC-20)", address: PLATFORM_TRON_ADDRESS, fee: "<$0.01" };
const SOL = { network: "Solana", address: PLATFORM_SOL_ADDRESS || PLATFORM_USDC_ADDRESS, fee: "<$0.01" };

const COINS: CoinOption[] = [
  { symbol: "USDC", name: "USD Coin", icon: "💵", networks: [ETH, BSC, SOL] },
  { symbol: "USDT", name: "Tether", icon: "💚", networks: [TRON, ETH, BSC, SOL] },
  { symbol: "DAI", name: "Dai", icon: "🟡", networks: [ETH] },
  { symbol: "FDUSD", name: "First Digital USD", icon: "💲", networks: [ETH, BSC] },
  { symbol: "TUSD", name: "TrueUSD", icon: "✅", networks: [ETH] },
  { symbol: "BTC", name: "Bitcoin", icon: "🟠", networks: [{ network: "Bitcoin", address: PLATFORM_USDC_ADDRESS, fee: "~$0.50-$3" }] },
  { symbol: "ETH", name: "Ethereum", icon: "🔷", networks: [{ network: "Ethereum", address: PLATFORM_USDC_ADDRESS, fee: "~$0.50-$3" }] },
  { symbol: "BNB", name: "BNB", icon: "🟨", networks: [BSC] },
  { symbol: "SOL", name: "Solana", icon: "🟣", networks: [SOL] },
  { symbol: "XRP", name: "Ripple", icon: "💧", networks: [{ network: "Ripple", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "ADA", name: "Cardano", icon: "🔵", networks: [{ network: "Cardano", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "AVAX", name: "Avalanche", icon: "🔺", networks: [{ network: "Avalanche", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "DOT", name: "Polkadot", icon: "🔴", networks: [{ network: "Polkadot", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "MATIC", name: "Polygon", icon: "🟪", networks: [ETH] },
  { symbol: "POL", name: "Polygon Ecosystem", icon: "🟪", networks: [ETH] },
  { symbol: "ATOM", name: "Cosmos", icon: "⚛️", networks: [{ network: "Cosmos", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "NEAR", name: "NEAR Protocol", icon: "🌐", networks: [{ network: "Near", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "ALGO", name: "Algorand", icon: "🔶", networks: [{ network: "Algorand", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "XLM", name: "Stellar", icon: "⭐", networks: [{ network: "Stellar", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "FIL", name: "Filecoin", icon: "📁", networks: [{ network: "Filecoin", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "TRX", name: "TRON", icon: "❤️", networks: [TRON] },
  { symbol: "HBAR", name: "Hedera", icon: "🌿", networks: [BSC] },
  { symbol: "ICP", name: "Internet Computer", icon: "∞", networks: [{ network: "ICP", address: PLATFORM_ICP_ADDRESS, fee: "<$0.01" }] },
  { symbol: "VET", name: "VeChain", icon: "⛓️", networks: [{ network: "VeChain", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "FTM", name: "Fantom", icon: "👻", networks: [{ network: "Fantom", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "INJ", name: "Injective", icon: "💉", networks: [ETH] },
  { symbol: "RUNE", name: "THORChain", icon: "⚔️", networks: [{ network: "THORChain", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "APT", name: "Aptos", icon: "🏗️", networks: [{ network: "Aptos", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "SUI", name: "Sui", icon: "🌊", networks: [{ network: "Sui", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "SEI", name: "Sei", icon: "⚡", networks: [{ network: "Sei", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "TIA", name: "Celestia", icon: "🔲", networks: [{ network: "Celestia", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "STRK", name: "Starknet", icon: "🦁", networks: [{ network: "Starknet", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "ARB", name: "Arbitrum", icon: "🔷", networks: [ETH] },
  { symbol: "OP", name: "Optimism", icon: "🔴", networks: [ETH] },
  { symbol: "ZK", name: "zkSync", icon: "⚙️", networks: [ETH] },
  { symbol: "MANTA", name: "Manta Network", icon: "🌊", networks: [ETH] },
  { symbol: "UNI", name: "Uniswap", icon: "🦄", networks: [ETH] },
  { symbol: "AAVE", name: "Aave", icon: "👻", networks: [ETH] },
  { symbol: "MKR", name: "Maker", icon: "🏦", networks: [ETH] },
  { symbol: "COMP", name: "Compound", icon: "🏛️", networks: [ETH] },
  { symbol: "CRV", name: "Curve DAO", icon: "📈", networks: [ETH] },
  { symbol: "LDO", name: "Lido DAO", icon: "💧", networks: [ETH] },
  { symbol: "PENDLE", name: "Pendle", icon: "⏳", networks: [ETH] },
  { symbol: "ENA", name: "Ethena", icon: "🌀", networks: [ETH] },
  { symbol: "EIGEN", name: "EigenLayer", icon: "🛡️", networks: [ETH] },
  { symbol: "LINK", name: "Chainlink", icon: "🔗", networks: [ETH] },
  { symbol: "GRT", name: "The Graph", icon: "📊", networks: [ETH] },
  { symbol: "RNDR", name: "Render", icon: "🎨", networks: [ETH] },
  { symbol: "FET", name: "Fetch.ai", icon: "🤖", networks: [ETH] },
  { symbol: "AGIX", name: "SingularityNET", icon: "🧠", networks: [ETH] },
  { symbol: "OCEAN", name: "Ocean Protocol", icon: "🌊", networks: [ETH] },
  { symbol: "TAO", name: "Bittensor", icon: "🧬", networks: [{ network: "Bittensor", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "WLD", name: "Worldcoin", icon: "🌍", networks: [ETH] },
  { symbol: "AR", name: "Arweave", icon: "📦", networks: [{ network: "Arweave", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "SAND", name: "The Sandbox", icon: "🏖️", networks: [ETH] },
  { symbol: "MANA", name: "Decentraland", icon: "🌍", networks: [ETH] },
  { symbol: "AXS", name: "Axie Infinity", icon: "🪓", networks: [ETH] },
  { symbol: "GALA", name: "Gala", icon: "🎮", networks: [ETH] },
  { symbol: "IMX", name: "Immutable X", icon: "🔄", networks: [ETH] },
  { symbol: "ENJ", name: "Enjin Coin", icon: "🎯", networks: [ETH] },
  { symbol: "ILV", name: "Illuvium", icon: "⚔️", networks: [ETH] },
  { symbol: "YGG", name: "Yield Guild Games", icon: "🎖️", networks: [ETH] },
  { symbol: "PRIME", name: "Echelon Prime", icon: "🃏", networks: [ETH] },
  { symbol: "BEAM", name: "Beam", icon: "💡", networks: [ETH] },
  { symbol: "SUPER", name: "SuperVerse", icon: "🦸", networks: [ETH] },
  { symbol: "DOGE", name: "Dogecoin", icon: "🐕", networks: [{ network: "Dogecoin", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "SHIB", name: "Shiba Inu", icon: "🐶", networks: [ETH] },
  { symbol: "PEPE", name: "Pepe", icon: "🐸", networks: [ETH] },
  { symbol: "FLOKI", name: "Floki", icon: "🐕", networks: [ETH] },
  { symbol: "BONK", name: "Bonk", icon: "🦴", networks: [SOL] },
  { symbol: "WIF", name: "dogwifhat", icon: "🎩", networks: [SOL] },
  { symbol: "LTC", name: "Litecoin", icon: "⚡", networks: [{ network: "Litecoin", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "BCH", name: "Bitcoin Cash", icon: "🟢", networks: [{ network: "Bitcoin Cash", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "ZEC", name: "Zcash", icon: "🛡️", networks: [{ network: "Zcash", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "DASH", name: "Dash", icon: "💨", networks: [{ network: "Dash", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "ETC", name: "Ethereum Classic", icon: "🔹", networks: [{ network: "Ethereum Classic", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "STX", name: "Stacks", icon: "📚", networks: [{ network: "Stacks", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "CFX", name: "Conflux", icon: "🌐", networks: [{ network: "Conflux", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "FLOW", name: "Flow", icon: "🌊", networks: [{ network: "Flow", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "EGLD", name: "MultiversX", icon: "🌍", networks: [{ network: "MultiversX", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "MINA", name: "Mina Protocol", icon: "🔬", networks: [{ network: "Mina", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "BLUR", name: "Blur", icon: "🖼️", networks: [ETH] },
  { symbol: "APE", name: "ApeCoin", icon: "🦧", networks: [ETH] },
  { symbol: "ENS", name: "Ethereum Name Service", icon: "🏷️", networks: [ETH] },
  { symbol: "JUP", name: "Jupiter", icon: "🪐", networks: [SOL] },
  { symbol: "JTO", name: "Jito", icon: "🥩", networks: [SOL] },
  { symbol: "PYTH", name: "Pyth Network", icon: "🔮", networks: [SOL] },
  { symbol: "W", name: "Wormhole", icon: "🕳️", networks: [SOL] },
  { symbol: "KAIA", name: "Kaia", icon: "🌙", networks: [{ network: "Klaytn", address: PLATFORM_KLAYTN_ADDRESS, fee: "<$0.01" }] },
  { symbol: "KLAY", name: "Klaytn", icon: "🟫", networks: [{ network: "Klaytn", address: PLATFORM_KLAYTN_ADDRESS, fee: "<$0.01" }] },
  { symbol: "ONDO", name: "Ondo Finance", networks: [ETH] },
  { symbol: "CAKE", name: "PancakeSwap", networks: [BSC] },
  { symbol: "ZRO", name: "LayerZero", networks: [ETH] },
  { symbol: "MNT", name: "Mantle", networks: [ETH] },
  { symbol: "BLAST", name: "Blast", networks: [ETH] },
  { symbol: "MODE", name: "Mode", networks: [ETH] },
  { symbol: "SCROLL", name: "Scroll", networks: [ETH] },
  { symbol: "ZKJ", name: "Polyhedra", networks: [ETH] },
  { symbol: "CELO", name: "Celo", networks: [ETH] },
  { symbol: "AXL", name: "Axelar", networks: [ETH] },
  { symbol: "ALT", name: "AltLayer", networks: [ETH] },
  { symbol: "ETHFI", name: "ether.fi", networks: [ETH] },
  { symbol: "REZ", name: "Renzo", networks: [ETH] },
  { symbol: "OMNI", name: "Omni Network", networks: [ETH] },
  { symbol: "SNX", name: "Synthetix", networks: [ETH] },
  { symbol: "SUSHI", name: "SushiSwap", networks: [ETH] },
  { symbol: "YFI", name: "yearn.finance", networks: [ETH] },
  { symbol: "BAL", name: "Balancer", networks: [ETH] },
  { symbol: "CVX", name: "Convex Finance", networks: [ETH] },
  { symbol: "FXS", name: "Frax Share", networks: [ETH] },
  { symbol: "GMX", name: "GMX", networks: [ETH, { network: "Arbitrum", address: PLATFORM_USDC_ADDRESS, fee: "<$0.01" }] },
  { symbol: "DYDX", name: "dYdX", networks: [ETH] },
  { symbol: "JOE", name: "Trader Joe", networks: [ETH] },
  { symbol: "STG", name: "Stargate Finance", networks: [ETH] },
  { symbol: "RDNT", name: "Radiant Capital", networks: [ETH] },
  { symbol: "MAGIC", name: "Treasure", networks: [ETH] },
  { symbol: "1INCH", name: "1inch Network", networks: [ETH] },
  { symbol: "TURBO", name: "Turbo", networks: [ETH] },
  { symbol: "MEW", name: "cat in a dogs world", networks: [SOL] },
  { symbol: "POPCAT", name: "Popcat", networks: [SOL] },
  { symbol: "NEIRO", name: "Neiro", networks: [ETH] },
  { symbol: "MOG", name: "Mog Coin", networks: [ETH] },
  { symbol: "BRETT", name: "Brett", networks: [ETH] },
  { symbol: "GOAT", name: "Goatseus Maximus", networks: [SOL] },
  { symbol: "PENGU", name: "Pudgy Penguins", networks: [SOL] },
  { symbol: "PIXEL", name: "Pixels", networks: [ETH] },
  { symbol: "MAVIA", name: "Heroes of Mavia", networks: [ETH] },
  { symbol: "XAI", name: "Xai", networks: [ETH] },
  { symbol: "ACE", name: "Fusionist", networks: [ETH] },
  { symbol: "PORTAL", name: "Portal", networks: [ETH] },
  { symbol: "AEVO", name: "Aevo", networks: [ETH] },
  { symbol: "VANRY", name: "Vanar Chain", networks: [ETH] },
  { symbol: "HIGH", name: "Highstreet", networks: [ETH] },
  { symbol: "BAKE", name: "BakeryToken", networks: [BSC] },
  { symbol: "MEME", name: "Memecoin", networks: [ETH] },
  { symbol: "PEOPLE", name: "ConstitutionDAO", networks: [ETH] },
  { symbol: "RACA", name: "Radio Caca", networks: [BSC] },
];

interface Props { listingId: string; amountUsd: number; buyerId: string; quantity: number; onSuccess: () => void; onCancel: () => void; }

export function CryptoCheckout({ listingId, amountUsd, buyerId, quantity, onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selCoin, setSelCoin] = useState<CoinOption | null>(null);
  const [selNet, setSelNet] = useState<NetworkOption | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [coinSearch, setCoinSearch] = useState("");
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [testMode, setTestMode] = useState(false);

  const filteredCoins = COINS.filter(c => 
  c.symbol.toLowerCase().includes(coinSearch.toLowerCase()) || 
  c.name.toLowerCase().includes(coinSearch.toLowerCase())
);

  const copyAddr = async () => { if (!selNet) return; await navigator.clipboard.writeText(selNet.address); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const verify = async () => {
    if (!testMode && !txHash.trim()) return;
    if (!selCoin || !selNet) return;
    setVerifying(true); setError("");
    try {
      const { data, error: fnError } = await (supabase.functions as Any).invoke("verify-crypto-payment", {
        body: { listingId, amountUsd, buyerId, quantity, txHash: txHash.trim() || `test-${Date.now()}`, network: selNet.network, test: testMode },
      });
      if (fnError) throw fnError;
      if (data?.verified) onSuccess();
      else setError(data?.error || "Transaction not found. Wait 1-2 minutes and try again.");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Verification failed"); }
    finally { setVerifying(false); }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-dark-light">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Deposit Crypto</h3>
        <button onClick={onCancel} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"><X className="h-4 w-4" /></button>
      </div>

      {/* Amount */}
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Amount to pay</p>
        <p className="mt-1 text-2xl font-extrabold tabular-nums text-gray-900 dark:text-white">${amountUsd}</p>
      </div>

      {/* Test mode toggle */}
      <label className="flex cursor-pointer items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
        <input type="checkbox" checked={testMode} onChange={e => setTestMode(e.target.checked)} className="h-3 w-3 rounded accent-amber-500" />
        Test mode — skip blockchain verification
      </label>

      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-3">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
              step >= s ? "bg-primary text-white" : "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500"
            }`}>{s}</div>
            {s < 3 && <div className={`h-0.5 w-8 rounded transition-all ${step > s ? "bg-primary" : "bg-gray-200 dark:bg-white/10"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Coin */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">1. Select Coin</p>
        {selCoin ? (
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 dark:border-primary/30 dark:bg-primary/10">
            <div className="flex items-center gap-2">
              <CoinIcon symbol={selCoin.symbol} />
              <span className="text-sm font-bold text-gray-900 dark:text-white">{selCoin.symbol}</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{selCoin.name}</span>
            </div>
            <button onClick={() => { setSearchOpen(true); if (step >= 2) setStep(1); }}
              className="text-[10px] font-medium text-primary hover:underline">Change</button>
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-gray-300 dark:border-white/10 dark:bg-dark-light dark:hover:border-white/20">
            <span className="text-sm text-gray-400 dark:text-gray-500">Search coin...</span>
            <Search className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Step 2: Network */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">2. Select Network</p>
        {selCoin ? (
          <div className="space-y-1.5">
            {selCoin.networks.map(n => (
              <button key={n.network} onClick={() => { setSelNet(n); setStep(Math.max(step, 2) as 2 | 3); }}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                  selNet?.network === n.network
                    ? "border-primary/30 bg-primary/5 dark:border-primary/30 dark:bg-primary/10"
                    : "border-gray-200 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20"
                }`}>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{n.network}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Network fee: {n.fee}</p>
                </div>
                {selNet?.network === n.network && <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary"><Check className="h-3 w-3 text-white" /></div>}
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500">Select a coin first</p>
          </div>
        )}
      </div>

      {/* Step 3: Address */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">3. Deposit Address</p>
        {selNet ? (
          <div className="space-y-3">
            {/* Warning */}
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                Send only <strong>{selCoin!.symbol}</strong> via <strong>{selNet.network}</strong>. Other assets or networks won't be credited.
              </p>
            </div>

            {/* Instructions */}
            <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Instructions</p>
              <ol className="space-y-1 text-[11px] text-blue-800 dark:text-blue-300">
                <li className="flex gap-1.5"><span className="font-bold shrink-0">1.</span>Open your wallet and select <strong>{selCoin!.symbol}</strong></li>
                <li className="flex gap-1.5"><span className="font-bold shrink-0">2.</span>Send <strong>${amountUsd}</strong> using <strong>{selNet.network}</strong></li>
                <li className="flex gap-1.5"><span className="font-bold shrink-0">3.</span>Paste the deposit address</li>
                <li className="flex gap-1.5"><span className="font-bold shrink-0">4.</span>Confirm and send</li>
                <li className="flex gap-1.5"><span className="font-bold shrink-0">5.</span>Paste transaction hash below</li>
              </ol>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
              <code className="flex-1 break-all text-[11px] font-mono text-gray-700 dark:text-gray-300">{selNet.address}</code>
              <button onClick={copyAddr} className="shrink-0 rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-300">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Tx hash */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Transaction hash</p>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">Paste after sending</span>
              </div>
              <input type="text" value={txHash} onChange={e => setTxHash(e.target.value)} placeholder={testMode ? "[TEST] any hash" : "0x..."} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 dark:border-white/10 dark:bg-dark-light dark:text-white" />
            </div>

            {error && <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</div>}

            <button onClick={verify} disabled={(!testMode && !txHash.trim()) || verifying}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-sm shadow-primary/20 transition-all hover:bg-primary-dark disabled:opacity-50">
              {verifying ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying...</> : "I've sent the payment"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center dark:border-white/10">
            <p className="text-xs text-gray-400 dark:text-gray-500">Select coin and network first</p>
          </div>
        )}
      </div>

      {/* Coin search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
            {/* Search header */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/10">
              <button onClick={() => setSearchOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"><ArrowLeft className="h-4 w-4" /></button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" value={coinSearch} onChange={e => setCoinSearch(e.target.value)} placeholder="Search coin" autoFocus
                  className="w-full rounded-lg bg-gray-100 py-2.5 pl-9 pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none dark:bg-white/5 dark:text-white" />
              </div>
            </div>
            {/* Coin list */}
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredCoins.map(c => (
                <button key={c.symbol} onClick={() => { setSelCoin(c); const autoNet = c.networks.length === 1 ? c.networks[0] : null; setSelNet(autoNet); setSearchOpen(false); setStep(autoNet ? 2 : 1); setCoinSearch(""); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-gray-50 dark:hover:bg-white/5">
                  <CoinIcon symbol={c.symbol} />
                  <div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{c.symbol}</span>
                    <span className="ml-1.5 text-[11px] text-gray-400 dark:text-gray-500">{c.name}</span>
                  </div>
                </button>
              ))}
              {filteredCoins.length === 0 && (
                <p className="py-8 text-center text-xs text-gray-400">No coins found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
