#!/usr/bin/env node
import { realAdapterManifest } from "../src/adapters/real-adapter-manifest.js";
console.log(JSON.stringify(realAdapterManifest(), null, 2));
