import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BankAccountModule = buildModule("BankAccountModule", (m) => {
  const bankAccount = m.contract("BankAccount");

  return {
    bankAccount,
  };
});

export default BankAccountModule;
