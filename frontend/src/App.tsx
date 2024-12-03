import { useEffect, useState } from "react";
import BankAccount from "../../artifacts/contracts/BankAccount.sol/BankAccount.json";
import { AddressLike, ethers } from "ethers";
import { BigNumberish } from "ethers";
const bankAccountContractAddress = import.meta.env
  .VITE_BANK_ACCOUNT_CONTRACT_ADDRESS;
function App() {
  const [connectedToMetamask, setConnectedToMetamask] = useState(false);
  const [connectedAccount, setConnectedAccount] =
    useState<AddressLike | null>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>();
  const [contract, setContract] = useState<ethers.Contract | null>();
  const [accounts, setAccounts] = useState<BigNumberish[]>([]);
  const [otherOwners, setOtherOwners] = useState<string>(""); // addresses separated by comma
  const [contractEvents, setContractEvents] = useState<
    { name: string; args: unknown[] }[]
  >([]);
  const connectToMetamask = async () => {
    //@ts-expect-error ethereum object exists when metamask is connected
    const provider = new ethers.BrowserProvider(window.ethereum);

    await provider.send("eth_requestAccounts", []);

    const _signer = await provider.getSigner();
    setSigner(_signer);
    setConnectedAccount(_signer.address);
    const _contract = new ethers.Contract(
      bankAccountContractAddress,
      BankAccount.abi,
      _signer
    );
    setContract(_contract);
    _contract
      .getAccounts()
      .then((accounts: number[]) => {
        setAccounts(accounts);
      })
      .catch((err) => console.log("Failed to fetch accounts: ", err));
    _contract.on(
      "AccountCreated",
      (owners: AddressLike[], accountId: number, timestamp: number) => {
        setContractEvents([
          ...contractEvents,
          {
            name: "AccountCreated",
            args: [owners, accountId, timestamp],
          },
        ]);
      }
    );
    return { contract: _contract, signer: _signer };
  };

  const createAccount = async () => {
    let _contract = contract as ethers.Contract | null;
    if (!contract) {
      const connected = await connectToMetamask();
      _contract = connected.contract;
    }
    try {
      const addresses = otherOwners
        .split(",")
        .map((address) => address.trim())
        .filter((n) => n) as AddressLike[];
      console.log("Creating account with addresses: ", addresses);
      await _contract!.createAccount(addresses);
      console.log("Account created");
      setOtherOwners("");
    } catch (err) {
      console.log("Failed to create account: ", err);
    }
  };

  const fetchAccounts = async () => {
    console.log("Fetching accounts");
    let _contract = contract as ethers.Contract | null;
    if (!contract) {
      const connected = await connectToMetamask();
      _contract = connected.contract;
    }
    try {
      console.log("Contract connected... getting accounts");
      const _accounts = (await _contract!.getAccounts()) as BigNumberish[];
      setAccounts(_accounts);
      console.log("Accounts: ", _accounts);
    } catch (err) {
      //Empty
      console.log("Failed to fetch accounts: ", err);
    }
    console.log("Done fetching accounts");
  };

  useEffect(() => {
    //@ts-expect-error ethereum object exists when metamask is connected
    if (window.ethereum) {
      connectToMetamask()
        .then(() => setConnectedToMetamask(true))
        .catch((err) => console.log(err));
      //@ts-expect-error ethereum object exists when metamask is connected
      window.ethereum.on("accountsChanged", (accounts: AddressLike[]) => {
        console.log("accountsChanged: ", accounts[0]);
        connectToMetamask()
          .then(() => setConnectedToMetamask(true))
          .catch((err) => console.log(err));
      });
    } else {
      alert("Metamask not installed");
    }
  }, []);

  return (
    <div>
      <h1>
        Joint Bank Account DApp -{" "}
        {connectedToMetamask ? "Connected " + connectedAccount : "Disconnected"}
      </h1>
      <div>
        <h2>Create Account</h2>
        <input
          type="text"
          id="owners"
          value={otherOwners}
          onChange={(e) => setOtherOwners(e.target.value)}
        />
        <button onClick={createAccount}>Create Account</button>
      </div>
      <div>
        <h2>View Accounts</h2>
        <ul id="accounts">
          {accounts.map((account) => (
            <li key={account}>{account.toString()}</li>
          ))}
        </ul>
        <button onClick={fetchAccounts}>Refresh Accounts</button>
      </div>
      <div id="events">
        <h2>Events</h2>
        <ul>
          {contractEvents.map((event) => (
            <li key={event.name}>
              {event.name} -{" "}
              {JSON.stringify(
                event.args.map((a) => {
                  if (typeof a === "bigint") {
                    return a.toString();
                  }
                  return a;
                })
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
