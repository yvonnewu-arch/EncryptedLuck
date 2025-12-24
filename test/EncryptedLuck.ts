import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedLuck, EncryptedLuck__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedLuck")) as EncryptedLuck__factory;
  const contract = (await factory.deploy()) as EncryptedLuck;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("EncryptedLuck", function () {
  let signers: Signers;
  let contract: EncryptedLuck;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("starts with zero encrypted points", async function () {
    const encryptedPoints = await contract.getPoints(signers.alice.address);
    expect(encryptedPoints).to.eq(ethers.ZeroHash);
  });

  it("buys a ticket and stores encrypted picks", async function () {
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(3)
      .add8(7)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .buyTicket(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof, {
        value: ethers.parseEther("0.001"),
      });
    await tx.wait();

    const [pickOne, pickTwo, active] = await contract.getTicket(signers.alice.address);
    expect(active).to.eq(true);

    const clearPickOne = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      pickOne,
      contractAddress,
      signers.alice,
    );
    const clearPickTwo = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      pickTwo,
      contractAddress,
      signers.alice,
    );

    expect(clearPickOne).to.eq(3);
    expect(clearPickTwo).to.eq(7);
  });

  it("draws numbers and updates points", async function () {
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(2)
      .add8(5)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .buyTicket(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof, {
        value: ethers.parseEther("0.001"),
      });
    await tx.wait();

    tx = await contract.connect(signers.alice).draw();
    await tx.wait();

    const [_, __, active] = await contract.getTicket(signers.alice.address);
    expect(active).to.eq(false);

    const encryptedPoints = await contract.getPoints(signers.alice.address);
    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPoints,
      contractAddress,
      signers.alice,
    );

    expect([0, 1, 10]).to.include(Number(clearPoints));
  });

  it("reverts when ticket price is incorrect", async function () {
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(1)
      .add8(9)
      .encrypt();

    await expect(
      contract
        .connect(signers.alice)
        .buyTicket(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof, {
          value: ethers.parseEther("0.0005"),
        })
    ).to.be.revertedWith("Ticket costs 0.001 ETH");
  });
});
