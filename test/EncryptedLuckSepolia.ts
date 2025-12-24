import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { EncryptedLuck } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EncryptedLuckSepolia", function () {
  let signers: Signers;
  let contract: EncryptedLuck;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn("This hardhat test suite can only run on Sepolia Testnet");
      this.skip();
    }

    try {
      const deployment = await deployments.get("EncryptedLuck");
      contractAddress = deployment.address;
      contract = await ethers.getContractAt("EncryptedLuck", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("buys a ticket and draws", async function () {
    steps = 6;
    this.timeout(4 * 40000);

    progress("Encrypting picks...");
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add8(4)
      .add8(8)
      .encrypt();

    progress("Buying ticket...");
    let tx = await contract
      .connect(signers.alice)
      .buyTicket(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof, {
        value: ethers.parseEther("0.001"),
      });
    await tx.wait();

    progress("Drawing numbers...");
    tx = await contract.connect(signers.alice).draw();
    await tx.wait();

    progress("Reading points...");
    const encryptedPoints = await contract.getPoints(signers.alice.address);
    expect(encryptedPoints).to.not.eq(ethers.ZeroHash);

    progress("Decrypting points...");
    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPoints,
      contractAddress,
      signers.alice,
    );
    expect([0, 1, 10]).to.include(Number(clearPoints));
  });
});
