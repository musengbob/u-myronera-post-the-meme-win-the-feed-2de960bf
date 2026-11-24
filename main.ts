// "Post the Meme, Win the Feed" — entrypoint for make.fun (Node 22, standard
// library only, no dependencies, no network, no wall clock).
//
// What it does:
//   1. Reads the meme image (entry.png) shipped at this repository's root.
//   2. Validates it: it must exist, be a real PNG, and be non-empty.
//   3. Writes it byte-identical to the output directory as entry.png.
//   4. Reads the written file back and proves it is byte-identical
//      (same size and same SHA-256) before exiting 0.
//
// The post itself is the entry: the X post named by POST.json is scored by
// likes + reposts + quotes. This program also copies POST.json to the output
// directory when the repository carries one, so the gate can read it; when
// there is no POST.json yet (the post is still to be made) that step is
// skipped and the image copy still succeeds.
//
// Where the files live:
//   * The repository is read from MAKEFUN_BOT_DIR when set, otherwise from
//     the directory holding this file. In the grader the repo is mounted
//     read-only at /bot and MAKEFUN_BOT_DIR is /bot.
//   * Output goes ONLY to MAKEFUN_OUTPUT_DIR when it is set. In the grader
//     that is /output (an empty writable directory). Only when the variable
//     is absent does the program fall back to a local ./output next to this
//     file. It never creates or writes a repo-relative output/ path while
//     MAKEFUN_OUTPUT_DIR is set, because the repo is read-only there and
//     such a write would fail the run.
//
// Determinism: the program copies fixed bytes and prints only fixed values
// (file names, sizes and hashes), so two runs produce byte-identical output.

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The directory this file lives in is the repository root, both locally
// (this file sits at the repo root) and in the grader (/bot/main.ts).
const REPO_DIR: string = dirname(fileURLToPath(import.meta.url));

// Read-only in the grader; fall back to the repo root for local runs.
const BOT_DIR: string = process.env.MAKEFUN_BOT_DIR ?? REPO_DIR;

// The ONLY place this program writes. Set by the grader to /output.
// Falls back to a local ./output only when the variable is absent.
const OUTPUT_DIR: string =
  process.env.MAKEFUN_OUTPUT_DIR ?? join(REPO_DIR, "output");

const IMAGE_NAME = "entry.png";
const POST_NAME = "POST.json";

// A PNG file always starts with these eight bytes.
const PNG_SIGNATURE: Buffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

function main(): void {
  const sourceImage: string = join(BOT_DIR, IMAGE_NAME);
  if (!existsSync(sourceImage)) {
    fail(`source image not found: ${sourceImage}`);
  }
  const sourceStat = statSync(sourceImage);
  if (!sourceStat.isFile() || sourceStat.size === 0) {
    fail(`source image is empty or not a file: ${sourceImage}`);
  }

  const sourceBytes: Buffer = readFileSync(sourceImage);
  if (
    sourceBytes.length < PNG_SIGNATURE.length ||
    !sourceBytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
  ) {
    fail(`source image is not a PNG file: ${sourceImage}`);
  }

  // The meme must be a readable square-ish picture: read its width and
  // height from the PNG IHDR chunk (bytes 16-23, big-endian) and refuse
  // anything tiny or wildly non-square, which would not read on a phone
  // feed. entry.png is 1600x1600.
  if (sourceBytes.length < 24 || sourceBytes.toString("ascii", 12, 16) !== "IHDR") {
    fail(`source image has no PNG IHDR chunk: ${sourceImage}`);
  }
  const width: number = sourceBytes.readUInt32BE(16);
  const height: number = sourceBytes.readUInt32BE(20);
  if (width < 512 || height < 512) {
    fail(`source image too small: ${width}x${height} (need at least 512x512)`);
  }
  const aspect: number = width / height;
  if (aspect < 0.8 || aspect > 1.25) {
    fail(`source image is not square-ish: ${width}x${height}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputImage: string = join(OUTPUT_DIR, IMAGE_NAME);
  copyFileSync(sourceImage, outputImage);

  const writtenBytes: Buffer = readFileSync(outputImage);
  const sourceHash: string = sha256Hex(sourceBytes);
  const writtenHash: string = sha256Hex(writtenBytes);
  if (writtenBytes.length !== sourceBytes.length || writtenHash !== sourceHash) {
    fail(
      `output image differs from source: ${outputImage} ` +
        `(source ${sourceBytes.length} bytes sha256 ${sourceHash}, ` +
        `written ${writtenBytes.length} bytes sha256 ${writtenHash})`,
    );
  }

  console.log(
    `main.ts: wrote ${IMAGE_NAME} (${writtenBytes.length} bytes, ` +
      `sha256 ${writtenHash}) to ${OUTPUT_DIR}`,
  );

  // The gate reads the post's address from /output/POST.json, so copy the
  // repository's POST.json through when one exists. It must be a JSON
  // object with a "url" string naming an X post. When the repository has
  // no POST.json yet (the X post is still to be made) this step is skipped
  // on purpose: the image copy above is the program's real work, and a
  // missing post file must not fail the run.
  const sourcePost: string = join(BOT_DIR, POST_NAME);
  if (existsSync(sourcePost)) {
    const postText: string = readFileSync(sourcePost, "utf8");
    let postUrl: unknown;
    try {
      postUrl = (JSON.parse(postText) as { url?: unknown }).url;
    } catch {
      fail(`POST.json is not valid JSON: ${sourcePost}`);
    }
    if (typeof postUrl !== "string" || postUrl.length === 0) {
      fail(`POST.json has no "url" string: ${sourcePost}`);
    }
    const outputPost: string = join(OUTPUT_DIR, POST_NAME);
    copyFileSync(sourcePost, outputPost);
    const copiedText: string = readFileSync(outputPost, "utf8");
    if (copiedText !== postText) {
      fail(`output POST.json differs from source: ${outputPost}`);
    }
    console.log(`main.ts: wrote ${POST_NAME} (${postUrl}) to ${OUTPUT_DIR}`);
  } else {
    console.log(
      `main.ts: no ${POST_NAME} in ${BOT_DIR} yet; ` +
        `skipping the post-file copy (image copy above still stands)`,
    );
  }
}

main();
