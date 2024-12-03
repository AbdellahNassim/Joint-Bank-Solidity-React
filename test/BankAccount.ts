import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("BankAccount", function () {
  async function deployBankAccountFixture() {
    const [owner, account1, account2, account3, account4] =
      await ethers.getSigners();

    const BankAccount = await ethers.getContractFactory("BankAccount");
    const bankAccount = await BankAccount.deploy();

    return { bankAccount, owner, account1, account2, account3, account4 };
  }

  async function deployBankAccountWithAccountsFixture(
    owners = 1,
    deposit = 0,
    withdrawAmounts: number[] = []
  ) {
    const { bankAccount, owner, account1, account2, account3, account4 } =
      await loadFixture(deployBankAccountFixture);

    const addresses = [];
    for (let i = 1; i <= owners - 1; i++) {
      addresses.push(eval(`account${i}`).address);
    }

    await bankAccount.connect(owner).createAccount(addresses);
    if (deposit > 0) {
      await bankAccount
        .connect(owner)
        .deposit(0, { value: deposit.toString() });
    }

    for (const withdrawAmount of withdrawAmounts) {
      await bankAccount.connect(owner).requestWithdraw(0, withdrawAmount);
    }

    return { bankAccount, owner, account1, account2, account3, account4 };
  }

  describe("Deployment", function () {
    it("should deploy without error", async function () {
      await loadFixture(deployBankAccountFixture);
    });
  });

  describe("createAccount", function () {
    it("should create a single account", async function () {
      const { bankAccount, owner } = await loadFixture(
        deployBankAccountFixture
      );
      await bankAccount.connect(owner).createAccount([]);
      const accounts = await bankAccount.connect(owner).getAccounts();
      expect(accounts.length).to.equal(1);
    });
    it("should create a double account", async function () {
      const { bankAccount, owner, account1 } = await loadFixture(
        deployBankAccountFixture
      );
      await bankAccount.connect(owner).createAccount([account1.address]);
      const accountsOwner = await bankAccount.connect(owner).getAccounts();
      expect(accountsOwner.length).to.equal(1);

      const accounts1 = await bankAccount.connect(account1).getAccounts();
      expect(accounts1.length).to.equal(1);
    });
    it("should create a triple account", async function () {
      const { bankAccount, owner, account1, account2 } = await loadFixture(
        deployBankAccountFixture
      );
      await bankAccount
        .connect(owner)
        .createAccount([account1.address, account2.address]);
      const accountsOwner = await bankAccount.connect(owner).getAccounts();
      expect(accountsOwner.length).to.equal(1);

      const accounts1 = await bankAccount.connect(account1).getAccounts();
      expect(accounts1.length).to.equal(1);

      const accounts2 = await bankAccount.connect(account2).getAccounts();
      expect(accounts2.length).to.equal(1);
    });

    it("should create a quad account", async function () {
      const { bankAccount, owner, account1, account2, account3 } =
        await loadFixture(deployBankAccountFixture);
      await bankAccount
        .connect(owner)
        .createAccount([account1.address, account2.address, account3.address]);
      const accountsOwner = await bankAccount.connect(owner).getAccounts();
      expect(accountsOwner.length).to.equal(1);

      const accounts1 = await bankAccount.connect(account1).getAccounts();
      expect(accounts1.length).to.equal(1);

      const accounts2 = await bankAccount.connect(account2).getAccounts();
      expect(accounts2.length).to.equal(1);

      const accounts3 = await bankAccount.connect(account3).getAccounts();
      expect(accounts3.length).to.equal(1);
    });
    it("should not allow to create an account with duplicate owners", async function () {
      const { bankAccount, owner } = await loadFixture(
        deployBankAccountFixture
      );
      await expect(bankAccount.connect(owner).createAccount([owner.address])).be
        .reverted;
    });
    it("should not allow to create an account with more than 4 owners", async function () {
      const { bankAccount, owner, account1, account2, account3, account4 } =
        await loadFixture(deployBankAccountFixture);
      await expect(
        bankAccount
          .connect(owner)
          .createAccount([
            account1.address,
            account2.address,
            account3.address,
            account4.address,
          ])
      ).be.reverted;
    });
    it("should not allow to create an account for a user with already 3 accounts", async function () {
      const { bankAccount, owner } = await loadFixture(
        deployBankAccountFixture
      );

      for (let i = 0; i < 3; i++) {
        await bankAccount.connect(owner).createAccount([]);
      }
      await expect(bankAccount.connect(owner).createAccount([])).be.reverted;
    });
  });

  describe("deposit", function () {
    it("should allow to deposit from account owner", async function () {
      const { bankAccount, owner } = await deployBankAccountWithAccountsFixture(
        1
      );

      await expect(
        bankAccount.connect(owner).deposit(0, { value: "100" })
      ).to.changeEtherBalances([bankAccount, owner], ["100", "-100"]);
    });
    it("should not allow to deposit from non account owner", async function () {
      const { bankAccount, owner, account1 } =
        await deployBankAccountWithAccountsFixture(1);

      await expect(bankAccount.connect(account1).deposit(0, { value: "100" }))
        .to.be.reverted;
    });
  });
  describe("Withdraw", function () {
    describe("Request withdraw", function () {
      it("should allow account owner to make a withdraw request", async function () {
        const { bankAccount, owner } =
          await deployBankAccountWithAccountsFixture(1, 100);
        await bankAccount.connect(owner).requestWithdraw(0, 100);
      });
      it("should allow account owner to make multiple withdraw requests", async function () {
        const { bankAccount, owner } =
          await deployBankAccountWithAccountsFixture(1, 100);
        await bankAccount.connect(owner).requestWithdraw(0, 100);
        await bankAccount.connect(owner).requestWithdraw(0, 100);
      });
      it("should not allow non account owner to make a withdraw request", async function () {
        const { bankAccount, owner, account1 } =
          await deployBankAccountWithAccountsFixture(1, 100);
        await expect(bankAccount.connect(account1).requestWithdraw(0, 100)).to
          .be.reverted;
      });
      it("should not allow account owner to make a withdraw request with amount greater than balance", async function () {
        const { bankAccount, owner } =
          await deployBankAccountWithAccountsFixture(1, 100);
        await expect(bankAccount.connect(owner).requestWithdraw(0, 200)).to.be
          .reverted;
      });
    });
    describe("Approve withdraw", function () {
      it("should allow account owner to approve a withdraw request", async function () {
        const { bankAccount, owner, account1 } =
          await deployBankAccountWithAccountsFixture(2, 400, [100]);

        await bankAccount.connect(account1).approveWithdraw(0, 0);
        expect(await bankAccount.connect(account1).getApprovals(0, 0)).to.equal(
          1
        );
      });
      it("should not allow non account owner to approve a withdraw request", async function () {
        const { bankAccount, account2, account1 } =
          await deployBankAccountWithAccountsFixture(2, 400, [100]);

        await expect(bankAccount.connect(account2).approveWithdraw(0, 0)).to.be
          .reverted;
      });
      it("should not allow account owner to approve a withdraw request mutiple times", async function () {
        const { bankAccount, account1 } =
          await deployBankAccountWithAccountsFixture(2, 400, [100]);
        await bankAccount.connect(account1).approveWithdraw(0, 0);
        await expect(bankAccount.connect(account1).approveWithdraw(0, 0)).to.be
          .reverted;
      });
      it("should not allow account owner that made the request to approve it", async function () {
        const { bankAccount, owner, account1 } =
          await deployBankAccountWithAccountsFixture(2, 400, [100]);
        await expect(bankAccount.connect(owner).approveWithdraw(0, 0)).to.be
          .reverted;
      });
    });
    describe("Make withdraw", function () {
      it("should  allow account owner that made the request to withdraw it when he is the only owner", async function () {
        const { bankAccount, owner, account1 } =
          await deployBankAccountWithAccountsFixture(1, 400, [100]);

        await expect(
          await bankAccount.connect(owner).withdraw(0, 0)
        ).to.changeEtherBalances([bankAccount, owner], ["-100", "100"]);
      });
      it("should  allow account owner that made the request to withdraw it when request is approved", async function () {
        const { bankAccount, owner, account1, account2 } =
          await deployBankAccountWithAccountsFixture(3, 400, [100]);

        await bankAccount.connect(account1).approveWithdraw(0, 0);
        await bankAccount.connect(account2).approveWithdraw(0, 0);
        await expect(
          await bankAccount.connect(owner).withdraw(0, 0)
        ).to.changeEtherBalances([bankAccount, owner], ["-100", "100"]);
      });
      it("should not allow account owner that made the request to withdraw it more than once when request is approved", async function () {
        const { bankAccount, owner, account1, account2 } =
          await deployBankAccountWithAccountsFixture(3, 400, [100]);

        await bankAccount.connect(account1).approveWithdraw(0, 0);
        await bankAccount.connect(account2).approveWithdraw(0, 0);
        await expect(
          await bankAccount.connect(owner).withdraw(0, 0)
        ).to.changeEtherBalances([bankAccount, owner], ["-100", "100"]);
        await expect(bankAccount.connect(owner).withdraw(0, 0)).to.be.reverted;
      });
      it("should not allow account owner that made the request to withdraw it when request is not approved", async function () {
        const { bankAccount, owner, account1 } =
          await deployBankAccountWithAccountsFixture(3, 400, [100]);
        await bankAccount.connect(account1).approveWithdraw(0, 0);
        await expect(bankAccount.connect(owner).withdraw(0, 0)).to.be.reverted;
      });
      it("should not allow account that is not owner to withdraw a request", async function () {
        const { bankAccount, owner, account1, account2 } =
          await deployBankAccountWithAccountsFixture(2, 400, [100]);
        await bankAccount.connect(account1).approveWithdraw(0, 0);
        await expect(bankAccount.connect(account2).withdraw(0, 0)).to.be
          .reverted;
      });
    });
  });
});
