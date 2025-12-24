import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and interact locally
 * =====================================
 *
 * 1. Start node
 *    npx hardhat node
 *
 * 2. Deploy
 *    npx hardhat --network localhost deploy
 *
 * 3. Interact
 *    npx hardhat --network localhost task:buy-ticket --first 3 --second 7
 *    npx hardhat --network localhost task:draw
 *    npx hardhat --network localhost task:decrypt-points
 */

task("task:address", "Prints the EncryptedLuck address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const deployed = await deployments.get("EncryptedLuck");
  console.log("EncryptedLuck address is " + deployed.address);
});

task("task:buy-ticket", "Buy a ticket with two numbers (1-9)")
  .addOptionalParam("address", "Optionally specify the EncryptedLuck contract address")
  .addParam("first", "First number 1-9")
  .addParam("second", "Second number 1-9")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const first = parseInt(taskArguments.first);
    const second = parseInt(taskArguments.second);
    if (!Number.isInteger(first) || !Number.isInteger(second)) {
      throw new Error("Arguments --first and --second must be integers");
    }

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("EncryptedLuck");
    console.log(`EncryptedLuck: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("EncryptedLuck", deployment.address);

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signers[0].address)
      .add8(first)
      .add8(second)
      .encrypt();

    const tx = await contract
      .connect(signers[0])
      .buyTicket(encryptedInput.handles[0], encryptedInput.handles[1], encryptedInput.inputProof, {
        value: ethers.parseEther("0.001"),
      });

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:draw", "Draw random numbers and update points")
  .addOptionalParam("address", "Optionally specify the EncryptedLuck contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("EncryptedLuck");
    console.log(`EncryptedLuck: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("EncryptedLuck", deployment.address);

    const tx = await contract.connect(signers[0]).draw();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:decrypt-points", "Decrypt the caller's points")
  .addOptionalParam("address", "Optionally specify the EncryptedLuck contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("EncryptedLuck");
    console.log(`EncryptedLuck: ${deployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("EncryptedLuck", deployment.address);

    const encryptedPoints = await contract.getPoints(signers[0].address);
    if (encryptedPoints === ethers.ZeroHash) {
      console.log(`Encrypted points: ${encryptedPoints}`);
      console.log("Clear points    : 0");
      return;
    }

    const clearPoints = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPoints,
      deployment.address,
      signers[0],
    );

    console.log(`Encrypted points: ${encryptedPoints}`);
    console.log(`Clear points    : ${clearPoints}`);
  });
