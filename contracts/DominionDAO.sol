// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DominionDAO - a small educational DAO treasury
/// @notice Contributors become stakeholders after contributing at least 0.01 ETH.
contract DominionDAO {
    uint256 public constant MIN_STAKEHOLDER_CONTRIBUTION = 0.01 ether;
    uint256 public constant VOTING_DURATION = 5 minutes;

    struct Proposal {
        uint256 id;
        uint256 amount;
        uint256 deadline;
        uint256 upvotes;
        uint256 downvotes;
        string title;
        string description;
        bool paid;
        address payable beneficiary;
        address proposer;
        address executor;
    }

    struct Vote {
        address voter;
        uint256 timestamp;
        bool choice;
    }

    uint256 public daoBalance;
    uint256 public totalProposals;
    mapping(address => uint256) public contributions;
    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => Vote[]) private proposalVotes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    uint256 private unlocked = 1;

    event ContributionReceived(address indexed contributor, uint256 amount, uint256 totalContribution);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address indexed beneficiary, uint256 amount);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool choice);
    event BeneficiaryPaid(uint256 indexed proposalId, address indexed beneficiary, uint256 amount, address executor);

    modifier onlyStakeholder() {
        require(isStakeholder(msg.sender), "Stakeholder only");
        _;
    }

    modifier validProposal(uint256 proposalId) {
        require(proposalId < totalProposals, "Proposal does not exist");
        _;
    }

    modifier nonReentrant() {
        require(unlocked == 1, "Reentrant call");
        unlocked = 2;
        _;
        unlocked = 1;
    }

    function contribute() external payable {
        require(msg.value > 0, "Contribution must be greater than zero");
        contributions[msg.sender] += msg.value;
        daoBalance += msg.value;
        emit ContributionReceived(msg.sender, msg.value, contributions[msg.sender]);
    }

    function createProposal(
        string calldata title,
        string calldata description,
        address payable beneficiary,
        uint256 amount
    ) external onlyStakeholder returns (uint256 proposalId) {
        require(bytes(title).length > 0, "Title is required");
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= daoBalance, "Insufficient DAO balance");

        proposalId = totalProposals++;
        proposals[proposalId] = Proposal({
            id: proposalId,
            amount: amount,
            deadline: block.timestamp + VOTING_DURATION,
            upvotes: 0,
            downvotes: 0,
            title: title,
            description: description,
            paid: false,
            beneficiary: beneficiary,
            proposer: msg.sender,
            executor: address(0)
        });

        emit ProposalCreated(proposalId, msg.sender, beneficiary, amount);
    }

    function performVote(uint256 proposalId, bool choice)
        external
        onlyStakeholder
        validProposal(proposalId)
    {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp < proposal.deadline, "Voting period has ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;
        if (choice) proposal.upvotes += 1;
        else proposal.downvotes += 1;
        proposalVotes[proposalId].push(Vote(msg.sender, block.timestamp, choice));

        emit VoteCast(proposalId, msg.sender, choice);
    }

    function payBeneficiary(uint256 proposalId)
        external
        onlyStakeholder
        validProposal(proposalId)
        nonReentrant
    {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.deadline, "Voting is still open");
        require(!proposal.paid, "Proposal already paid");
        require(proposal.upvotes > proposal.downvotes, "Proposal did not pass");
        require(proposal.amount <= daoBalance, "Insufficient DAO balance");

        proposal.paid = true;
        proposal.executor = msg.sender;
        daoBalance -= proposal.amount;

        (bool sent, ) = proposal.beneficiary.call{value: proposal.amount}("");
        require(sent, "Transfer failed");
        emit BeneficiaryPaid(proposalId, proposal.beneficiary, proposal.amount, msg.sender);
    }

    function isStakeholder(address account) public view returns (bool) {
        return contributions[account] >= MIN_STAKEHOLDER_CONTRIBUTION;
    }

    function getBalance(address account) external view returns (uint256) {
        return contributions[account];
    }

    function getProposal(uint256 proposalId)
        external
        view
        validProposal(proposalId)
        returns (Proposal memory)
    {
        return proposals[proposalId];
    }

    function getProposals() external view returns (Proposal[] memory result) {
        result = new Proposal[](totalProposals);
        for (uint256 i = 0; i < totalProposals; i++) result[i] = proposals[i];
    }

    function getVotesOf(uint256 proposalId)
        external
        view
        validProposal(proposalId)
        returns (Vote[] memory)
    {
        return proposalVotes[proposalId];
    }

    receive() external payable {
        contributions[msg.sender] += msg.value;
        daoBalance += msg.value;
        emit ContributionReceived(msg.sender, msg.value, contributions[msg.sender]);
    }
}

