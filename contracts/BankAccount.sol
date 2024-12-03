pragma solidity >=0.7.0 <0.9.0;

contract BankAccount {
    event Deposit(
        address indexed user,
        uint256 indexed accountId,
        uint256 amount,
        uint256 timestamp
    );
    event WithdrawRequested(
        address indexed user,
        uint256 indexed accountId,
        uint256 withdrawId,
        uint256 amount,
        uint256 timestamp
    );

    event Withdraw(uint256 indexed withdrawId, uint256 timestamp);

    event AccountCreated(
        address[] owners,
        uint256 indexed accountId,
        uint256 timestamp
    );
    struct WithdrawRequest {
        address user;
        uint256 amount;
        uint256 approvals;
        mapping(address => bool) approvedOwners;
        bool approved;
    }
    struct Account {
        address[] owners;
        uint256 balance;
        mapping(uint => WithdrawRequest) withdrawRequests;
    }

    mapping(uint => Account) accounts;
    mapping(address => uint[]) userAccounts;

    uint nextAccountId = 0;
    uint nextWithdrawId = 0;

    modifier accountOwner(uint accountId) {
        bool isOwner;
        for (uint i = 0; i < accounts[accountId].owners.length; i++) {
            if (accounts[accountId].owners[i] == msg.sender) {
                isOwner = true;
                break;
            }
        }
        require(isOwner, "You are not an owner of this account");
        _;
    }

    modifier validOwners(address[] calldata owners) {
        require(owners.length + 1 <= 4, "Too many owners");
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == msg.sender) {
                revert("Owners should be unique");
            }
            for (uint j = i + 1; j < owners.length; j++) {
                if (owners[i] == owners[j]) {
                    revert("Owners should be unique");
                }
            }
        }
        _;
    }
    modifier sufficientBalance(uint accountId, uint amount) {
        require(accounts[accountId].balance >= amount, "Insufficient balance");
        _;
    }

    modifier canApproveWithdraw(uint accountId, uint withdrawId) {
        WithdrawRequest storage withdrawRequest = accounts[accountId]
            .withdrawRequests[withdrawId];
        require(!withdrawRequest.approved, "Withdraw request already approved");
        require(
            withdrawRequest.user != msg.sender,
            "You cannot approve your own withdraw request"
        );
        require(
            withdrawRequest.user != address(0),
            "Withdraw request does not exist"
        );
        require(
            !withdrawRequest.approvedOwners[msg.sender],
            "Already approved"
        );
        _;
    }

    modifier canWithdraw(uint accountId, uint withdrawId) {
        WithdrawRequest storage withdrawRequest = accounts[accountId]
            .withdrawRequests[withdrawId];
        require(
            withdrawRequest.user == msg.sender,
            "You are not the owner of this withdraw"
        );
        require(
            accounts[accountId].owners.length == 1 || withdrawRequest.approved,
            "Withdraw request is not approved yet"
        );
        _;
    }

    function deposit(uint accountId) external payable accountOwner(accountId) {
        accounts[accountId].balance += msg.value;
        emit Deposit(msg.sender, accountId, msg.value, block.timestamp);
    }
    function createAccount(
        address[] calldata otherOwners
    ) external validOwners(otherOwners) {
        address[] memory owners = new address[](otherOwners.length + 1);
        owners[otherOwners.length] = msg.sender;

        uint id = nextAccountId;
        for (uint i = 0; i < owners.length; i++) {
            if (i < owners.length - 1) {
                owners[i] = otherOwners[i];
            }

            if (userAccounts[owners[i]].length > 2) {
                revert("Each user can have only 3 accounts at max");
            }

            userAccounts[owners[i]].push(id);
        }

        accounts[id].owners = owners;
        nextAccountId++;

        emit AccountCreated(owners, id, block.timestamp);
    }

    function requestWithdraw(
        uint accountId,
        uint amount
    ) external accountOwner(accountId) sufficientBalance(accountId, amount) {
        uint withdrawId = nextWithdrawId;

        WithdrawRequest storage withdrawRequest = accounts[accountId]
            .withdrawRequests[withdrawId];

        withdrawRequest.user = msg.sender;
        withdrawRequest.amount = amount;
        nextWithdrawId++;
        emit WithdrawRequested(
            msg.sender,
            accountId,
            withdrawId,
            amount,
            block.timestamp
        );
    }
    function approveWithdraw(
        uint accountId,
        uint withdrawId
    )
        external
        accountOwner(accountId)
        canApproveWithdraw(accountId, withdrawId)
    {
        WithdrawRequest storage withdrawRequest = accounts[accountId]
            .withdrawRequests[withdrawId];
        withdrawRequest.approvals++;
        withdrawRequest.approvedOwners[msg.sender] = true;
        if (
            withdrawRequest.approvals == accounts[accountId].owners.length - 1
        ) {
            withdrawRequest.approved = true;
        }
    }

    function withdraw(
        uint accountId,
        uint withdrawId
    ) external canWithdraw(accountId, withdrawId) {
        uint amount = accounts[accountId].withdrawRequests[withdrawId].amount;
        require(getBalance(accountId) >= amount, "Insufficient Balance");

        accounts[accountId].balance -= amount;
        delete accounts[accountId].withdrawRequests[withdrawId];
        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Failed to send");

        emit Withdraw(withdrawId, block.timestamp);
    }

    function getBalance(uint accountId) public view returns (uint256) {
        return accounts[accountId].balance;
    }
    function getOwners(uint accountId) public view returns (address[] memory) {
        return accounts[accountId].owners;
    }
    function getApprovals(
        uint accountId,
        uint withdrawId
    ) public view returns (uint256) {
        return accounts[accountId].withdrawRequests[withdrawId].approvals;
    }

    function getAccounts() public view returns (uint[] memory) {
        return userAccounts[msg.sender];
    }
}
