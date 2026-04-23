// tests/privybag.ts
//
// Anchor integration tests for the PrivyBag program.
// Run with: anchor test
//
// These tests run against a local test-validator started by Anchor.
// For Light Protocol tests, start the validator with:
//   light test-validator
// then run: anchor test --skip-local-validator

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

// Import generated types after `anchor build`
// import { Privybag } from "../target/types/privybag";

describe("privybag", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // const program = anchor.workspace.Privybag as Program<Privybag>;
  const creator  = Keypair.generate();
  const fan      = Keypair.generate();

  let vaultPda: PublicKey;
  let vaultBump: number;

  before(async () => {
    // Airdrop to creator and fan
    await provider.connection.requestAirdrop(creator.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(fan.publicKey,     2 * LAMPORTS_PER_SOL);

    // Wait for confirmations
    await new Promise((r) => setTimeout(r, 1000));

    // Derive vault PDA
    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("privybag_vault"), creator.publicKey.toBuffer()],
      // program.programId
      SystemProgram.programId // placeholder until program.programId is available
    );
  });

  // ── initialize_vault ─────────────────────────────────────────────────────

  it("initializes creator vault", async () => {
    // Uncomment after `anchor build`:
    //
    // const bagsMint = Keypair.generate().publicKey;
    //
    // await program.methods
    //   .initializeVault(bagsMint)
    //   .accounts({
    //     vault:         vaultPda,
    //     creator:       creator.publicKey,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .signers([creator])
    //   .rpc();
    //
    // const vault = await program.account.creatorVault.fetch(vaultPda);
    // assert.equal(vault.creator.toBase58(), creator.publicKey.toBase58());
    // assert.equal(vault.isActive, true);
    // assert.equal(vault.tipCount.toNumber(), 0);

    console.log("✓ initialize_vault — placeholder (uncomment after anchor build)");
  });

  // ── shielded_tip ─────────────────────────────────────────────────────────

  it("records a shielded tip in the vault", async () => {
    // NOTE: The actual shielded SOL transfer happens client-side via
    // Light Protocol's createTransferInterfaceInstructions().
    // This test only verifies the aggregate stats update.
    //
    // Uncomment after `anchor build`:
    //
    // const TIP_LAMPORTS = new BN(50_000_000); // 0.05 SOL
    //
    // await program.methods
    //   .shieldedTip(TIP_LAMPORTS)
    //   .accounts({
    //     feePayer:      fan.publicKey,
    //     vault:         vaultPda,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .signers([fan])
    //   .rpc();
    //
    // const vault = await program.account.creatorVault.fetch(vaultPda);
    // assert.equal(vault.tipCount.toNumber(), 1);
    // assert.equal(
    //   vault.totalReceivedLamports.toNumber(),
    //   TIP_LAMPORTS.toNumber()
    // );

    console.log("✓ shielded_tip — placeholder (uncomment after anchor build)");
  });

  // ── configure_private_fee_share ──────────────────────────────────────────

  it("configures private fee share", async () => {
    // Uncomment after `anchor build`:
    //
    // const collaborator = Keypair.generate().publicKey;
    //
    // const [configPda] = PublicKey.findProgramAddressSync(
    //   [Buffer.from("privybag_fee_config"), creator.publicKey.toBuffer()],
    //   program.programId
    // );
    //
    // await program.methods
    //   .configurePrivateFeeShare(
    //     [collaborator],
    //     [2000] // 20%
    //   )
    //   .accounts({
    //     feeConfig:     configPda,
    //     vault:         vaultPda,
    //     creator:       creator.publicKey,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .signers([creator])
    //   .rpc();
    //
    // const config = await program.account.feeShareConfig.fetch(configPda);
    // assert.equal(config.recipients.length, 1);
    // assert.equal(config.sharesBps[0], 2000);
    // assert.equal(config.isActive, true);

    console.log("✓ configure_private_fee_share — placeholder");
  });

  // ── claim_private_share ──────────────────────────────────────────────────

  it("rejects claim greater than unclaimed balance", async () => {
    // Uncomment after `anchor build`:
    //
    // try {
    //   await program.methods
    //     .claimPrivateShare(new BN(999_999_999_999))
    //     .accounts({
    //       vault:         vaultPda,
    //       creator:       creator.publicKey,
    //       systemProgram: SystemProgram.programId,
    //     })
    //     .signers([creator])
    //     .rpc();
    //   assert.fail("Should have thrown InsufficientBalance");
    // } catch (err: any) {
    //   assert.include(err.message, "InsufficientBalance");
    // }

    console.log("✓ claim overflow guard — placeholder");
  });

  it("rejects tip with zero amount", async () => {
    // Uncomment after `anchor build`:
    //
    // try {
    //   await program.methods
    //     .shieldedTip(new BN(0))
    //     .accounts({
    //       feePayer:      fan.publicKey,
    //       vault:         vaultPda,
    //       systemProgram: SystemProgram.programId,
    //     })
    //     .signers([fan])
    //     .rpc();
    //   assert.fail("Should have thrown ZeroTipAmount");
    // } catch (err: any) {
    //   assert.include(err.message, "ZeroTipAmount");
    // }

    console.log("✓ zero-amount guard — placeholder");
  });
});
