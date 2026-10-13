const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("DominionDAO", function () {
  async function fixture() {
    const [alice, bob, carol] = await ethers.getSigners();
    const DAO = await ethers.getContractFactory("DominionDAO");
    const dao = await DAO.deploy();
    return { dao, alice, bob, carol };
  }

  it("promotes a contributor to stakeholder at 0.01 ETH", async function () {
    const { dao, alice } = await fixture();
    await dao.connect(alice).contribute({ value: ethers.parseEther("0.01") });
    expect(await dao.isStakeholder(alice.address)).to.equal(true);
    expect(await dao.daoBalance()).to.equal(ethers.parseEther("0.01"));
  });

  it("runs the complete propose, vote, wait, and payout flow", async function () {
    const { dao, alice, bob } = await fixture();
    await dao.connect(alice).contribute({ value: ethers.parseEther("0.02") });
    await dao.connect(alice).createProposal(
      "PTIT workshop",
      "Pay the workshop organizer",
      bob.address,
      ethers.parseEther("0.005")
    );
    await dao.connect(alice).performVote(0, true);

    await expect(dao.connect(alice).payBeneficiary(0)).to.be.revertedWith("Voting is still open");
    await network.provider.send("evm_increaseTime", [301]);
    await network.provider.send("evm_mine");

    await expect(() => dao.connect(alice).payBeneficiary(0)).to.changeEtherBalance(
      bob,
      ethers.parseEther("0.005")
    );
    expect((await dao.getProposal(0)).paid).to.equal(true);
  });

  it("blocks duplicate votes and unauthorized proposal creation", async function () {
    const { dao, alice, carol } = await fixture();
    await dao.connect(alice).contribute({ value: ethers.parseEther("0.02") });
    await expect(
      dao.connect(carol).createProposal("No", "Unauthorized", carol.address, 1)
    ).to.be.revertedWith("Stakeholder only");
    await dao.connect(alice).createProposal("Valid", "Proposal", carol.address, 1);
    await dao.connect(alice).performVote(0, true);
    await expect(dao.connect(alice).performVote(0, false)).to.be.revertedWith("Already voted");
  });
});

