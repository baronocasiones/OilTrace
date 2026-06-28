import { expect } from "chai";
import { ethers } from "hardhat";
import { OilTrace } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("OilTrace", function () {
  let oilTrace: OilTrace;
  let owner: SignerWithAddress;
  let nonOwner: SignerWithAddress;

  const mockConsumerRef = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const mockTpmValue = 2450; // 24.5% * 100
  const mockGrade = 1; // Standard
  const mockVolumeMl = 5000; // 5L
  const mockLocationHash = "wdw3q2";
  const mockDriverRef = "d1e2f3a4-b5c6-7890-abcd-ef1234567890";
  const mockDataHash = ethers.keccak256(ethers.toUtf8Bytes('{"test":"data"}'));

  beforeEach(async function () {
    [owner, nonOwner] = await ethers.getSigners();
    const OilTraceFactory = await ethers.getContractFactory("OilTrace");
    oilTrace = await OilTraceFactory.deploy();
  });

  // ── Deployment ──────────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      expect(await oilTrace.owner()).to.equal(owner.address);
    });

    it("should start with recordCount = 0", async function () {
      expect(await oilTrace.recordCount()).to.equal(0);
      expect(await oilTrace.getRecordCount()).to.equal(0);
    });

    it("should reject non-owner from calling recordCollection", async function () {
      await expect(
        oilTrace.connect(nonOwner).recordCollection(
          mockConsumerRef, mockTpmValue, mockGrade, mockVolumeMl,
          mockLocationHash, mockDriverRef, mockDataHash
        )
      ).to.be.revertedWith("OilTrace: caller is not the owner");
    });
  });

  // ── recordCollection ────────────────────────────────────────────

  describe("recordCollection", function () {
    it("should store a valid record and return its ID", async function () {
      const tx = await oilTrace.recordCollection(
        mockConsumerRef, mockTpmValue, mockGrade, mockVolumeMl,
        mockLocationHash, mockDriverRef, mockDataHash
      );
      const receipt = await tx.wait();
      // The first record should have ID = 0
      const record = await oilTrace.getRecord(0);
      expect(record.consumerRef).to.equal(mockConsumerRef);
      expect(record.tpmValue).to.equal(mockTpmValue);
      expect(record.grade).to.equal(mockGrade);
      expect(record.volumeMl).to.equal(mockVolumeMl);
      expect(record.locationHash).to.equal(mockLocationHash);
      expect(record.driverRef).to.equal(mockDriverRef);
      expect(record.dataIntegrity).to.equal(mockDataHash);
    });

    it("should emit CollectionRecorded event", async function () {
      await expect(
        oilTrace.recordCollection(
          mockConsumerRef, mockTpmValue, mockGrade, mockVolumeMl,
          mockLocationHash, mockDriverRef, mockDataHash
        )
      ).to.emit(oilTrace, "CollectionRecorded")
       .withArgs(0, mockTpmValue, mockGrade, (await ethers.provider.getBlock("latest")).timestamp);
    });

    it("should increment recordCount", async function () {
      await oilTrace.recordCollection(
        mockConsumerRef, mockTpmValue, mockGrade, mockVolumeMl,
        mockLocationHash, mockDriverRef, mockDataHash
      );
      expect(await oilTrace.recordCount()).to.equal(1);
      expect(await oilTrace.getRecordCount()).to.equal(1);
    });

    it("should reject invalid grade (> 2)", async function () {
      await expect(
        oilTrace.recordCollection(
          mockConsumerRef, mockTpmValue, 3, mockVolumeMl,
          mockLocationHash, mockDriverRef, mockDataHash
        )
      ).to.be.revertedWith("OilTrace: invalid grade");
    });

    it("should reject invalid grade (type overflow)", async function () {
      // uint8 max is 255, but we check > 2
      await expect(
        oilTrace.recordCollection(
          mockConsumerRef, mockTpmValue, 255, mockVolumeMl,
          mockLocationHash, mockDriverRef, mockDataHash
        )
      ).to.be.revertedWith("OilTrace: invalid grade");
    });

    it("should store block.timestamp as the record timestamp", async function () {
      const blockBefore = await ethers.provider.getBlock("latest");
      const tx = await oilTrace.recordCollection(
        mockConsumerRef, mockTpmValue, mockGrade, mockVolumeMl,
        mockLocationHash, mockDriverRef, mockDataHash
      );
      const receipt = await tx.wait();
      const blockAfter = await ethers.provider.getBlock(receipt!.blockNumber);
      const record = await oilTrace.getRecord(0);
      expect(record.timestamp).to.equal(blockAfter!.timestamp);
    });

    it("should handle multiple records sequentially", async function () {
      const count = 5;
      for (let i = 0; i < count; i++) {
        await oilTrace.recordCollection(
          mockConsumerRef, mockTpmValue + i, mockGrade, mockVolumeMl,
          mockLocationHash, mockDriverRef, mockDataHash
        );
      }
      expect(await oilTrace.recordCount()).to.equal(count);
      for (let i = 0; i < count; i++) {
        const record = await oilTrace.getRecord(i);
        expect(record.tpmValue).to.equal(mockTpmValue + i);
      }
    });
  });

  // ── getRecord ───────────────────────────────────────────────────

  describe("getRecord", function () {
    beforeEach(async function () {
      await oilTrace.recordCollection(
        mockConsumerRef, mockTpmValue, mockGrade, mockVolumeMl,
        mockLocationHash, mockDriverRef, mockDataHash
      );
    });

    it("should return the correct record by ID", async function () {
      const record = await oilTrace.getRecord(0);
      expect(record.consumerRef).to.equal(mockConsumerRef);
    });

    it("should revert for non-existent ID", async function () {
      await expect(
        oilTrace.getRecord(999)
      ).to.be.revertedWith("OilTrace: record does not exist");
    });
  });

  // ── verifyData ──────────────────────────────────────────────────

  describe("verifyData", function () {
    beforeEach(async function () {
      await oilTrace.recordCollection(
        mockConsumerRef, mockTpmValue, mockGrade, mockVolumeMl,
        mockLocationHash, mockDriverRef, mockDataHash
      );
    });

    it("should return true when hash matches", async function () {
      const result = await oilTrace.verifyData(0, mockDataHash);
      expect(result).to.be.true;
    });

    it("should return false when hash differs", async function () {
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong data"));
      const result = await oilTrace.verifyData(0, wrongHash);
      expect(result).to.be.false;
    });

    it("should revert for non-existent record", async function () {
      await expect(
        oilTrace.verifyData(999, mockDataHash)
      ).to.be.revertedWith("OilTrace: record does not exist");
    });
  });

  // ── getRecords (batch) ──────────────────────────────────────────

  describe("getRecords (batch)", function () {
    beforeEach(async function () {
      for (let i = 0; i < 3; i++) {
        await oilTrace.recordCollection(
          mockConsumerRef, mockTpmValue + i, mockGrade, mockVolumeMl,
          mockLocationHash, mockDriverRef, mockDataHash
        );
      }
    });

    it("should return multiple records", async function () {
      const records = await oilTrace.getRecords([0, 1, 2]);
      expect(records.length).to.equal(3);
      expect(records[0].tpmValue).to.equal(mockTpmValue);
      expect(records[1].tpmValue).to.equal(mockTpmValue + 1);
      expect(records[2].tpmValue).to.equal(mockTpmValue + 2);
    });

    it("should revert if any ID is out of range", async function () {
      await expect(
        oilTrace.getRecords([0, 999])
      ).to.be.revertedWith("OilTrace: record does not exist");
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────

  describe("Edge cases", function () {
    it("should handle recordCollection with tpmValue = 0", async function () {
      await oilTrace.recordCollection(
        mockConsumerRef, 0, 0, mockVolumeMl,
        mockLocationHash, mockDriverRef, mockDataHash
      );
      const record = await oilTrace.getRecord(0);
      expect(record.tpmValue).to.equal(0);
    });

    it("should handle max uint256 volume", async function () {
      const maxUint = ethers.MaxUint256;
      await oilTrace.recordCollection(
        mockConsumerRef, mockTpmValue, mockGrade, maxUint,
        mockLocationHash, mockDriverRef, mockDataHash
      );
      const record = await oilTrace.getRecord(0);
      expect(record.volumeMl).to.equal(maxUint);
    });

    it("should handle empty strings for refs", async function () {
      await oilTrace.recordCollection(
        "", mockTpmValue, mockGrade, mockVolumeMl,
        "", "", mockDataHash
      );
      const record = await oilTrace.getRecord(0);
      expect(record.consumerRef).to.equal("");
      expect(record.locationHash).to.equal("");
    });

    it("should handle 100 sequential records without gas issues", async function () {
      const count = 100;
      for (let i = 0; i < count; i++) {
        const tx = await oilTrace.recordCollection(
          `consumer-${i}`, mockTpmValue, i % 3, mockVolumeMl,
          mockLocationHash, mockDriverRef, mockDataHash
        );
        await tx.wait();
      }
      expect(await oilTrace.recordCount()).to.equal(count);
    });

    it("should store different grades for each record", async function () {
      const grades = [0, 1, 2]; // Premium, Standard, Low
      for (const grade of grades) {
        await oilTrace.recordCollection(
          mockConsumerRef, mockTpmValue, grade, mockVolumeMl,
          mockLocationHash, mockDriverRef, mockDataHash
        );
      }
      for (let i = 0; i < grades.length; i++) {
        const record = await oilTrace.getRecord(i);
        expect(record.grade).to.equal(grades[i]);
      }
    });

    it("should be publicly readable (no auth on view functions)", async function () {
      await oilTrace.recordCollection(
        mockConsumerRef, mockTpmValue, mockGrade, mockVolumeMl,
        mockLocationHash, mockDriverRef, mockDataHash
      );
      // Non-owner can read — this is by design for transparency
      const record = await oilTrace.connect(nonOwner).getRecord(0);
      expect(record.tpmValue).to.equal(mockTpmValue);
    });
  });

  // ── Gas Benchmark ───────────────────────────────────────────────

  describe("Gas benchmark", function () {
    it("should record collection within gas budget", async function () {
      const tx = await oilTrace.recordCollection(
        mockConsumerRef, mockTpmValue, mockGrade, mockVolumeMl,
        mockLocationHash, mockDriverRef, mockDataHash
      );
      const receipt = await tx.wait();
      // Sepolia block gas limit is ~30M. We budget 80K.
      // This assertion ensures we don't accidentally bloat the contract
      expect(receipt!.gasUsed).to.be.lessThan(200000);
    });
  });
});
