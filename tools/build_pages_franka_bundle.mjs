#!/usr/bin/env node
import { gzipSync } from 'node:zlib';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { buildMuJoCoBundle } from '../core/xml_refs.mjs';

class BundleDOMParser extends XmlDomParser {
  parseFromString(...args) {
    const document = super.parseFromString(...args);
    document.querySelector = (selector) => document.querySelectorAll(selector)[0] || null;
    document.querySelectorAll = (selector) => {
      const match = String(selector).match(/^([\w:-]+)(?:\[([\w:-]+)\])?$/);
      if (!match) throw new Error(`Unsupported XML selector in bundle builder: ${selector}`);
      return Array.from(document.getElementsByTagName(match[1])).filter(
        (node) => !match[2] || node.hasAttribute(match[2]),
      );
    };
    return document;
  }
}

globalThis.DOMParser = BundleDOMParser;

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const sourceDir = path.resolve(readArg('--source'));
const outputPath = path.resolve(readArg('--output'));
if (!sourceDir || !outputPath) {
  throw new Error('Usage: build_pages_franka_bundle.mjs --source <model-dir> --output <bundle-file>');
}

const rootXml = await readFile(path.join(sourceDir, 'scene.xml'), 'utf8');
const readAsset = async (relativePath) => {
  const resolved = path.resolve(sourceDir, relativePath);
  const relative = path.relative(sourceDir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Model asset escapes its source directory: ${relativePath}`);
  }
  const bytes = await readFile(resolved);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const bundle = await buildMuJoCoBundle('scene.xml', rootXml, readAsset);
const payload = {
  xmlText: rootXml,
  xmlPath: `/mem/${bundle.xmlRel}`,
  files: bundle.files.map(({ path: filePath, data }) => ({
    path: filePath,
    data: Buffer.from(data).toString('base64'),
  })),
};

await mkdir(path.dirname(outputPath), { recursive: true });
const compressed = gzipSync(Buffer.from(JSON.stringify(payload)), { level: 9 });
await writeFile(outputPath, compressed);
console.log(`Built ${outputPath}: ${bundle.files.length} files, ${compressed.byteLength} compressed bytes`);
