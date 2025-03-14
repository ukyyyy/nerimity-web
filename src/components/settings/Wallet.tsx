import { createEffect, createSignal, onMount, Show, For } from "solid-js";
import { styled } from "solid-styled-components";
import { ethers } from "ethers";
import useStore from "@/chat-api/store/useStore";
import Breadcrumb, { BreadcrumbItem } from "../ui/Breadcrumb";
import { t } from "i18next";
import SettingsBlock from "../ui/settings-block/SettingsBlock";
import { Notice } from "../ui/Notice/Notice";
import Avatar from "../ui/Avatar";

const Container = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  flex-shrink: 0;
`;

export default function CryptoWallet() {
  const { header } = useStore();
  const [walletAddress, setWalletAddress] = createSignal<string | null>(null);
  const [balance, setBalance] = createSignal<string | null>(null);
  const [transactions, setTransactions] = createSignal<any[]>([]);
  const [provider, setProvider] = createSignal<ethers.BrowserProvider | null>(null);
  const [receiver, setReceiver] = createSignal("");
  const [amount, setAmount] = createSignal("");

  createEffect(() => {
    header.updateHeader({
      title: "Crypto Wallet",
      iconName: "account_balance_wallet",
    });
  });

  onMount(async () => {
    if (window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
    }
  });

  const connectWallet = async () => {
    if (!provider()) return alert("No Ethereum provider found");
    try {
      const accounts = await provider()!.send("eth_requestAccounts", []);
      setWalletAddress(accounts[0]);
      updateBalance(accounts[0]);
      fetchTransactions(accounts[0]);
    } catch (error) {
      console.error("Wallet connection failed", error);
    }
  };

  const updateBalance = async (address: string) => {
    if (!provider()) return;
    const balance = await provider()!.getBalance(address);
    setBalance(ethers.formatEther(balance) + " ETH");
  };

  const fetchTransactions = async (address: string) => {
    const etherscanApiKey = "GDWIFSFGWINFWAW197UVNED1DUR3NMJCYI";
    try {
      const response = await fetch(
        `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&apikey=${etherscanApiKey}`
      );
      const data = await response.json();
      setTransactions(data.result.slice(-5)); // Zeigt die letzten 5 Transaktionen
    } catch (error) {
      console.error("Transaction fetch failed", error);
    }
  };

  const sendTransaction = async () => {
    if (!provider() || !walletAddress()) return alert("Wallet not connected");
    if (!receiver() || !amount()) return alert("Enter recipient and amount");

    try {
      const signer = await provider()!.getSigner();
      const tx = await signer.sendTransaction({
        to: receiver(),
        value: ethers.parseEther(amount()),
      });

      alert(`Transaction sent! Hash: ${tx.hash}`);
      setReceiver("");
      setAmount("");
      updateBalance(walletAddress()!);
      fetchTransactions(walletAddress()!);
    } catch (error) {
      console.error("Transaction failed", error);
    }
  };

  return (
    <Container>
      <Breadcrumb>
        <BreadcrumbItem href="/app" icon="home" title={t("dashboard.title")} />
        <BreadcrumbItem title="Crypto Wallet" />
      </Breadcrumb>

      <Notice description="Connect your wallet to view balance and transactions." type="info" />

      <Show when={!walletAddress()}>
        <SettingsBlock label="Connect Wallet" icon="account_balance_wallet" onClick={connectWallet} />
      </Show>

      <Show when={walletAddress()}>
        <SettingsBlock label="Wallet Address" description={walletAddress()} icon="account_circle" />
        <SettingsBlock label="Balance" description={balance() || "Loading..."} icon="monetization_on" />

        <SettingsBlock label="Send ETH" icon="send">
          <input type="text" placeholder="Recipient Address" value={receiver()} onInput={(e) => setReceiver(e.currentTarget.value)} />
          <input type="number" placeholder="Amount (ETH)" value={amount()} onInput={(e) => setAmount(e.currentTarget.value)} />
          <button onClick={sendTransaction}>Send</button>
        </SettingsBlock>

        <SettingsBlock label="Recent Transactions" icon="history" />
        <For each={transactions()}>
          {(tx) => (
            <SettingsBlock
              label={`To: ${tx.to}`}
              description={`Value: ${ethers.formatEther(tx.value)} ETH`}
              icon="receipt"
              href={`https://etherscan.io/tx/${tx.hash}`}
              hrefBlank
            />
          )}
        </For>
      </Show>
    </Container>
  );
}
